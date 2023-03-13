// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/// @title DcnRegistry
/// @notice Contract that contains all date regarding names and basic functions to manage them
contract DcnRegistry is
    Initializable,
    ERC721Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
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

    string public baseURI;
    address public defaultResolver;
    address public dcnManager;
    mapping(bytes32 node => Record) public records;

    modifier exists(bytes32 node) {
        require(_exists(uint256(node)), "Node does not exist");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// ----- EXTERNAL FUNCTIONS ----- ///

    /// @notice Initialize function to be called after deployment
    /// @param name_ Token name
    /// @param symbol_ Token symbol
    /// @param baseURI_ Base URI
    /// @param defaultResolver_ Default resolver
    /// @param dcnManager_ DCN Manager address
    function initialize(
        string calldata name_,
        string calldata symbol_,
        string calldata baseURI_,
        address defaultResolver_,
        address dcnManager_
    ) external initializer {
        __ERC721_init_unchained(name_, symbol_);
        __AccessControl_init_unchained();
        __UUPSUpgradeable_init_unchained();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _setBaseURI(baseURI_);
        _setDefaultResolver(defaultResolver_);
        dcnManager = dcnManager_;

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
    /// @param defaultResolver_ the new default resolver address
    function setDefaultResolver(
        address defaultResolver_
    ) external onlyRole(ADMIN_ROLE) {
        _setDefaultResolver(defaultResolver_);
    }

    /// @notice Registers a new name and mints its corresponding token
    /// @dev Caller must be the DCN Manager
    /// @param to Token owner
    /// @param label Label to become a TLD
    /// @param resolver_ The address of the resolver to be set
    /// @param duration Period before name expires (in seconds)
    function mintTld(
        address to,
        string calldata label,
        address resolver_,
        uint256 duration
    ) external onlyRole(MANAGER_ROLE) returns (bytes32 node) {
        node = _namehash(0x00, label);
        _mintWithRecords(to, node, resolver_, duration);
    }

    /// @notice Registers a new name and mints its corresponding token
    /// @dev To mint ['a', 'b', 'c'], ['b', 'c'] has to exist
    /// @dev Caller must be the DCN Manager
    /// @dev Validates namehash before registering
    /// @param to Token owner
    /// @param labels List of labels (e.g ['label1', 'tld'] -> label1.tld)
    /// @param resolver_ The address of the resolver to be set
    /// @param duration Period before name expires (in seconds)
    function mint(
        address to,
        string[] calldata labels,
        address resolver_,
        uint256 duration
    ) external onlyRole(MANAGER_ROLE) returns (bytes32 node) {
        node = _validateNamehash(labels);
        _mintWithRecords(to, node, resolver_, duration);
    }

    /// @notice Renews the expiration of a node
    /// @dev Caller must be the DCN Manager
    /// @param node The node to be renewed
    /// @param duration The duration to extend the expiration (in seconds)
    function renew(
        bytes32 node,
        uint256 duration
    ) external onlyRole(MANAGER_ROLE) {
        uint256 currentExpiration = records[node].expires;
        uint256 newExpiration;

        if (currentExpiration > block.timestamp) {
            // The node has not expired, it extends from the current expiration date
            newExpiration = currentExpiration + duration;
        } else {
            // The node has expired, it extends from the current timestamp
            newExpiration = block.timestamp + duration;
        }

        _setExpiration(node, newExpiration);
    }

    /// @notice Claims the ownership of a token if it is expired
    /// @dev Caller must be the DCN Manager
    /// @dev The claimer is able to reset the resolver and duration
    /// @param to The new token owner
    /// @param node The node to be claimed
    /// @param resolver_ The address of the resolver to be set
    /// @param duration Period before name expires (in seconds)
    function claim(
        address to,
        bytes32 node,
        address resolver_,
        uint256 duration
    ) external onlyRole(MANAGER_ROLE) {
        // Checks internally if the token is minted, so we save a check
        _burn(uint256(node));
        require(records[node].expires < block.timestamp, "Not available");
        _mintWithRecords(to, node, resolver_, duration);
    }

    /// @notice Sets the resolver address for the specified node
    /// @dev Caller must be the DCN Manager and node must exist
    /// @param node The node to update
    /// @param resolver_ The address of the resolver to be set
    function setResolver(
        bytes32 node,
        address resolver_
    ) external onlyRole(MANAGER_ROLE) exists(node) {
        _setResolver(node, resolver_);
    }

    /// @notice Sets the expiration for the specified node
    /// @dev Caller must be the DCN Manager and node must exist
    /// @param node The node to update
    /// @param duration Period before name expires (in seconds)
    function setExpiration(
        bytes32 node,
        uint256 duration
    ) external onlyRole(MANAGER_ROLE) exists(node) {
        _setExpiration(node, block.timestamp + duration);
    }

    /// ----- EXTERNAL VIEW FUNCTIONS ----- ///

    /// @dev Returns the address of the resolver for the specified node
    /// @param node The specified node
    /// @return resolver_ address of the resolver
    function resolver(bytes32 node) external view returns (address resolver_) {
        resolver_ = records[node].resolver == address(0)
            ? defaultResolver
            : records[node].resolver;
    }

    /// @dev Returns the expiration of a node
    /// @param node The specified node
    /// @return expires_ expiration of the node
    function expires(bytes32 node) external view returns (uint256 expires_) {
        expires_ = records[node].expires;
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
    /// @param resolver_ Resolver address to be set
    function _setDefaultResolver(address resolver_) internal {
        require(resolver_ != address(0), "Zero address");
        defaultResolver = resolver_;
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
    /// @param node Namehash to be recorded
    /// @param resolver_ The address of the resolver to be set
    /// @param duration Period before name expires (in seconds)
    /// @return tokenId Token Id generated from namehash
    function _mintWithRecords(
        address to,
        bytes32 node,
        address resolver_,
        uint256 duration
    ) private returns (uint256 tokenId) {
        tokenId = uint256(node);

        _mint(to, tokenId);

        emit NewNode(node, to);

        _setResolver(node, resolver_);
        _setExpiration(node, block.timestamp + duration);
    }

    /// @dev Private function to set the resolver address for the specified node
    /// @param node The node to update
    /// @param resolver_ The address of the resolver to be set
    function _setResolver(bytes32 node, address resolver_) private {
        records[node].resolver = resolver_;
        emit NewResolver(node, resolver_);
    }

    /// @dev Private function to set the expiration for the specified node
    /// @param node The node to update
    /// @param expiration Period before name expires
    function _setExpiration(bytes32 node, uint256 expiration) private {
        records[node].expires = expiration;
        emit NewExpiration(node, expiration);
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
        require(labels.length > 1, "Labels length below 2");
        for (uint256 i = labels.length; i > 0; i--) {
            require(_exists(uint256(node)), "Parent node does not exist");
            node = _namehash(node, labels[i - 1]);
        }
    }
}
