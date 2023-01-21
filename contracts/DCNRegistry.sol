// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract DCNRegistry is
    Initializable,
    ERC721Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant TRANSFERER_ROLE = keccak256("TRANSFERER_ROLE");

    event NewResolver(bytes32 indexed node, address resolver);
    event NewTTL(bytes32 indexed node, uint72 ttl);
    event NewBaseURI(string indexed baseURI);
    event NewDefaultResolver(address indexed defaultResolver);

    struct Record {
        address resolver;
        uint72 ttl;
    }

    string public baseURI;
    address public defaultResolver;
    mapping(bytes32 => Record) public records;

    // Permits modifications only by the owner of the specified node.
    modifier authorized(bytes32 node) {
        require(
            hasRole(MINTER_ROLE, msg.sender) ||
                _isApprovedOrOwner(msg.sender, uint256(node))
        );
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
    /// @param baseURI_ Dase URI
    /// @param _defaultResolver Default resolver
    function initialize(
        string calldata _name,
        string calldata _symbol,
        string calldata baseURI_,
        address _defaultResolver
    ) external initializer {
        __ERC721_init_unchained(_name, _symbol);
        __AccessControl_init_unchained();
        __UUPSUpgradeable_init_unchained();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _setBaseURI(baseURI_);
        _setDefaultResolver(_defaultResolver);

        _mint(msg.sender, uint256(0x00));
        _setRecord(0x00, address(0), ~uint72(0));
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
    /// @dev Caller must have the minter role
    /// @param to Token owner
    /// @param labels List of labels (e.g ['label1', 'tld'] -> label1.tld)
    /// @param _resolver The address of the resolver to be set
    /// @param _ttl The TTL in seconds to be set
    function mint(
        address to,
        string[] calldata labels,
        address _resolver,
        uint72 _ttl
    ) external onlyRole(MINTER_ROLE) {
        _mintWithRecords(to, labels, _resolver, _ttl);
    }

    /// @notice Sets the record for a node
    /// @dev Caller must have the admin role
    /// @param node The node to update
    /// @param _resolver The address of the resolver to be set
    /// @param _ttl The TTL in seconds to be set
    function setRecord(
        bytes32 node,
        address _resolver,
        uint72 _ttl
    ) external onlyRole(ADMIN_ROLE) {
        require(_exists(uint256(node)), "Node does not exist");
        _setRecord(node, _resolver, _ttl);
    }

    /// @notice Sets the resolver address for the specified node
    /// @dev Caller must have the admin role
    /// @param node The node to update
    /// @param _resolver The address of the resolver to be set
    function setResolver(
        bytes32 node,
        address _resolver
    ) external onlyRole(ADMIN_ROLE) {
        require(_exists(uint256(node)), "Node does not exist");
        _setResolver(node, _resolver);
    }

    /// @notice Sets the TTL for the specified node
    /// @dev Caller must have the admin role
    /// @param node The node to update
    /// @param _ttl The TTL in seconds to be set
    function setTTL(bytes32 node, uint72 _ttl) external onlyRole(ADMIN_ROLE) {
        require(_exists(uint256(node)), "Node does not exist");
        _setTTL(node, _ttl);
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

    /// @dev Returns the TTL of a node
    /// @param node The specified node
    /// @return _ttl time to live of the node
    function ttl(bytes32 node) external view returns (uint72 _ttl) {
        _ttl = records[node].ttl;
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

    /// @dev Internal function to egister a new name and mints its corresponding token
    /// @dev Validates namehash before registering
    /// @param to Token owner
    /// @param labels List of labels (e.g ['label1', 'tld'] -> label1.tld)
    /// @param _resolver The address of the resolver to be set
    /// @param _ttl The TTL in seconds to be set
    function _mintWithRecords(
        address to,
        string[] calldata labels,
        address _resolver,
        uint72 _ttl
    ) internal {
        (bytes32 node, ) = _validateNamehash(labels);

        _mint(to, uint256(node));
        _setRecord(node, _resolver, _ttl);
    }

    /// @dev Internal function to set the record for a node
    /// @param node The node to update
    /// @param _resolver The address of the resolver to be set
    /// @param _ttl The TTL in seconds to be set
    function _setRecord(bytes32 node, address _resolver, uint72 _ttl) internal {
        if (_resolver != records[node].resolver) {
            records[node].resolver = _resolver;
            emit NewResolver(node, _resolver);
        }

        if (_ttl != records[node].ttl) {
            records[node].ttl = _ttl;
            emit NewTTL(node, _ttl);
        }
    }

    /// @dev Internal function to set the resolver address for the specified node
    /// @param node The node to update
    /// @param _resolver The address of the resolver to be set
    function _setResolver(bytes32 node, address _resolver) internal {
        records[node].resolver = _resolver;
        emit NewResolver(node, _resolver);
    }

    /// @dev Internal function to set the TTL for the specified node
    /// @param node The node to update
    /// @param _ttl The TTL in seconds to be set
    function _setTTL(bytes32 node, uint72 _ttl) internal {
        records[node].ttl = _ttl;
        emit NewTTL(node, _ttl);
    }

    /// @dev Internal function called when upgrading the contract
    /// @dev Caller must have the upgrader role
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    /// ----- PRIVATE FUNCTIONS ----- ///

    /// @dev Calculates the name hash of a label given the parent node
    /// @param node Parent node hash
    /// @param label Label to be hashed
    function _namehash(
        bytes32 node,
        string calldata label
    ) private pure returns (bytes32) {
        require(bytes(label).length != 0, "Empty label");
        return
            keccak256(
                abi.encodePacked(node, keccak256(abi.encodePacked(label)))
            );
    }

    /// @dev Iteratively Calculates the name hash of a list of labels
    /// @dev Verifies if parent node exists
    /// @param labels List of labels to be hashed
    function _validateNamehash(
        string[] calldata labels
    ) private view returns (bytes32 node, bytes32 parentNode) {
        for (uint256 i = labels.length; i > 0; i--) {
            require(_exists(uint256(node)), "Parent node does not exist");
            parentNode = node;
            node = _namehash(parentNode, labels[i - 1]);
        }
    }
}
