// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "hardhat/console.sol";

contract DcnRegistry is
    Initializable,
    ERC721Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant TRANSFERER_ROLE = keccak256("TRANSFERER_ROLE");

    event NewNode(bytes32 indexed node, address indexed owner);
    event NewResolver(bytes32 indexed node, address resolver);
    event NewExpiration(bytes32 indexed node, uint256 expiration);
    event NewBaseURI(string indexed baseURI);
    event NewDefaultResolver(address indexed defaultResolver);

    struct Record {
        address resolver;
        uint256 expires;
    }

    uint256 public gracePeriod;
    string public baseURI;
    address public defaultResolver;
    address public dcnManager;
    mapping(bytes32 => Record) public records;

    modifier exists(bytes32 node) {
        require(_exists(uint256(node)), "Node does not exist");
        _;
    }

    modifier authorized(bytes32 node) {
        require(_isApprovedOrOwner(msg.sender, uint256(node)));
        _;
    }

    modifier onlyDcnManager() {
        require(msg.sender == dcnManager, "Only DCN Manager");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// ----- EXTERNAL FUNCTIONS ----- ///

    /// @notice Initialize function to be called after deployment
    /// @param _name Token name
    /// @param _symbol Token symbol
    /// @param baseURI_ Base URI
    /// @param _defaultResolver Default resolver
    /// @param _dcnManager DCN Manager address
    /// @param _gracePeriod Grace period for claiming a name
    function initialize(
        string calldata _name,
        string calldata _symbol,
        string calldata baseURI_,
        address _defaultResolver,
        address _dcnManager,
        uint256 _gracePeriod
    ) external initializer {
        __ERC721_init_unchained(_name, _symbol);
        __AccessControl_init_unchained();
        __UUPSUpgradeable_init_unchained();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _setBaseURI(baseURI_);
        _setDefaultResolver(_defaultResolver);
        dcnManager = _dcnManager;
        gracePeriod = _gracePeriod;

        // Initial mint to ensure data consistency when _validateNamehash
        _mint(msg.sender, uint256(0x00));
        _setExpiration(0x00, ~uint256(0) - block.timestamp);
    }

    /// @notice Sets the base URI
    /// @dev Caller must have the admin role
    /// @param baseURI_ Base URI to be set
    function setBaseURI(
        string calldata baseURI_
    ) external onlyRole(ADMIN_ROLE) {
        _setBaseURI(baseURI_);
    }

    /// @notice Sets the default resolver
    /// @dev Caller must have the admin role
    /// @param _defaultResolver the new default resolver address
    function setDefaultResolver(
        address _defaultResolver
    ) external onlyRole(ADMIN_ROLE) {
        _setDefaultResolver(_defaultResolver);
    }

    /// @notice Registers a new name and mints its corresponding token
    /// @dev Caller must be the DCN Manager
    /// @param to Token owner
    /// @param label Label to become a TLD
    /// @param _resolver The address of the resolver to be set
    /// @param duration Period before name expires
    function mintTLD(
        address to,
        string calldata label,
        address _resolver,
        uint256 duration
    ) external onlyDcnManager {
        bytes32 node = _namehash(0x00, label);
        _mintWithRecords(to, node, _resolver, duration);
    }

    /// @notice Registers a new name and mints its corresponding token
    /// @dev Caller must be the DCN Manager
    /// @dev Validates namehash before registering
    /// @param to Token owner
    /// @param labels List of labels (e.g ['label1', 'tld'] -> label1.tld)
    /// @param _resolver The address of the resolver to be set
    /// @param duration Period before name expires
    function mint(
        address to,
        string[] calldata labels,
        address _resolver,
        uint256 duration
    ) external onlyDcnManager returns (bytes32 node) {
        node = _validateNamehash(labels);
        _mintWithRecords(to, node, _resolver, duration);
    }

    /// TODO Documentation
    function claim(
        address to,
        bytes32 node,
        address _resolver,
        uint256 duration
    ) external onlyDcnManager {
        // Checks internally if the token is minted, so we save a check
        _burn(uint256(node));
        require(
            records[node].expires + gracePeriod < block.timestamp,
            "Not available"
        );
        _mintWithRecords(to, node, _resolver, duration);
    }

    /// TODO Documentation
    function renew(
        address to,
        bytes32 node,
        uint256 duration
    ) external onlyDcnManager {
        _validateRenewal(node, duration);
    }

    /// @notice Sets the resolver address for the specified node
    /// @dev Caller must be approved or node owner
    /// @param node The node to update
    /// @param _resolver The address of the resolver to be set
    function setResolver(
        bytes32 node,
        address _resolver
    ) external onlyDcnManager exists(node) {
        _setResolver(node, _resolver);
    }

    /// @notice Sets the expiration for the specified node
    /// @dev Caller must be approved or node owner
    /// @param node The node to update
    /// @param duration Period before name expires
    function setExpiration(
        bytes32 node,
        uint256 duration
    ) external onlyDcnManager exists(node) {
        _validateNewExpiration(node, duration);
    }

    /// ----- EXTERNAL VIEW FUNCTIONS ----- ///

    /// @dev Returns the address of the resolver for the specified node
    /// @param node The specified node
    /// @return _resolver address of the resolver
    function resolver(bytes32 node) external view returns (address _resolver) {
        _resolver = records[node].resolver == address(0)
            ? defaultResolver
            : records[node].resolver;
    }

    /// @dev Returns the expiration of a node
    /// @param node The specified node
    /// @return _expires expiration of the node
    function expires(bytes32 node) external view returns (uint256 _expires) {
        _expires = records[node].expires;
    }

    /// @dev Returns whether a record has been imported to the registry
    /// @param node The specified node
    /// @return Bool if record exists
    function recordExists(bytes32 node) external view returns (bool) {
        return _exists(uint256(node));
    }

    /// ----- PUBLIC FUNCTIONS ----- ///

    /// @dev Returns true if this contract implements the interface defined by `interfaceId`
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /// ----- INTERNAL FUNCTIONS ----- ///

    /// @notice Gets the base URI
    /// @return string
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    /// @dev Internal function to set the base URI
    /// @param baseURI_ Base URI to be set
    function _setBaseURI(string calldata baseURI_) internal {
        baseURI = baseURI_;
        emit NewBaseURI(baseURI);
    }

    /// @dev Internal function to set the default resolver
    /// @dev Resolver cannot be the zero address
    /// @param _resolver Resolver address to be set
    function _setDefaultResolver(address _resolver) internal {
        require(_resolver != address(0), "Zero address");
        defaultResolver = _resolver;
        emit NewDefaultResolver(defaultResolver);
    }

    /// @dev Internal function to transfer a token
    /// @dev Caller must have the transferer role
    /// @param from Old owner
    /// @param to New owner
    /// @param tokenId Token Id to be transferred
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override onlyRole(TRANSFERER_ROLE) {
        super._transfer(from, to, tokenId);
    }

    /// @dev Internal function called when upgrading the contract
    /// @dev Caller must have the upgrader role
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    /// ----- PRIVATE FUNCTIONS ----- ///

    /// @dev Private function to register a new name and mints its corresponding token
    /// @param to Token owner
    /// @param _node Namehash to be recorded
    /// @param _resolver The address of the resolver to be set
    /// @param duration Period before name expires
    /// @return _tokenId Token Id generated from namehash
    function _mintWithRecords(
        address to,
        bytes32 _node,
        address _resolver,
        uint256 duration
    ) private returns (uint256 _tokenId) {
        _tokenId = uint256(_node);

        _mint(to, _tokenId);

        emit NewNode(_node, to);

        _setResolver(_node, _resolver);
        _validateNewExpiration(_node, duration);
    }

    /// @dev Private function to set the resolver address for the specified node
    /// @param node The node to update
    /// @param _resolver The address of the resolver to be set
    function _setResolver(bytes32 node, address _resolver) private {
        records[node].resolver = _resolver;
        emit NewResolver(node, _resolver);
    }

    /// @dev Private function to set the expiration for the specified node
    /// @param node The node to update
    /// @param _expiration Period before name expires
    function _setExpiration(bytes32 node, uint256 _expiration) private {
        records[node].expires = _expiration;
        emit NewExpiration(node, _expiration);
    }

    function _validateNewExpiration(bytes32 node, uint256 duration) private {
        require(
            block.timestamp + duration + gracePeriod >
                block.timestamp + gracePeriod,
            "Overflow"
        );

        _setExpiration(node, block.timestamp + duration);
    }

    function _validateRenewal(
        bytes32 node,
        uint256 duration
    ) private {
        uint256 currentExpiration = records[node].expires;
        require(
            currentExpiration + gracePeriod >= block.timestamp,
            "Invalid period"
        );
        // Prevent future overflow
        require(
            currentExpiration + duration + gracePeriod > duration + gracePeriod,
            "Overflow"
        );

        _setExpiration(node, currentExpiration + duration);
    }

    /// @dev Calculates the name hash of a label given the parent node
    /// @param node Parent node hash
    /// @param label Label to be hashed
    /// @return hashed Hashed label
    function _namehash(
        bytes32 node,
        string calldata label
    ) private pure returns (bytes32 hashed) {
        require(bytes(label).length != 0, "Empty label");
        hashed = keccak256(
            abi.encodePacked(node, keccak256(abi.encodePacked(label)))
        );
    }

    /// @dev Iteratively Calculates the name hash of a list of labels
    /// @dev Verifies if parent node exists
    /// @param labels List of labels to be hashed
    /// @return node The hashed node
    function _validateNamehash(
        string[] calldata labels
    ) private view returns (bytes32 node) {
        require(labels.length >= 2, "Lables length below 2");
        for (uint256 i = labels.length; i > 0; i--) {
            require(_exists(uint256(node)), "Parent node does not exist");
            node = _namehash(node, labels[i - 1]);
        }
    }
}
