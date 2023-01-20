// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./IDCNRegistry.sol";

/**
 * The DCN registry contract.
 */
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

    /// TODO Documentation
    function setDefaultResolver(
        address _defaultResolver
    ) external onlyRole(ADMIN_ROLE) {
        _setDefaultResolver(_defaultResolver);
    }

    /// TODO Documentation
    function mint(
        address to,
        string[] calldata labels,
        address _resolver,
        uint72 _ttl
    ) external onlyRole(MINTER_ROLE) {
        _mintWithRecords(to, labels, _resolver, _ttl);
    }

    // TODO Documentation
    function setRecord(
        bytes32 node,
        address _resolver,
        uint72 _ttl
    ) external onlyRole(ADMIN_ROLE) {
        require(_exists(uint256(node)), "Node does not exist");
        _setRecord(node, _resolver, _ttl);
    }

    // TODO Documentation
    function setResolver(
        bytes32 node,
        address _resolver
    ) external onlyRole(ADMIN_ROLE) {
        require(_exists(uint256(node)), "Node does not exist");
        _setResolver(node, _resolver);
    }

    // TODO Documentation
    function setTTL(bytes32 node, uint72 _ttl) external onlyRole(ADMIN_ROLE) {
        require(_exists(uint256(node)), "Node does not exist");
        _setTTL(node, _ttl);
    }

    /// ----- EXTERNAL VIEW FUNCTIONS ----- ///

    /**
     * @dev Returns the address of the resolver for the specified node.
     * @param node The specified node.
     * @return _resolver address of the resolver.
     */
    function resolver(bytes32 node) external view returns (address _resolver) {
        _resolver = records[node].resolver == address(0)
            ? defaultResolver
            : records[node].resolver;
    }

    /**
     * @dev Returns the TTL of a node, and any records associated with it.
     * @param node The specified node.
     * @return _ttl ttl of the node.
     */
    function ttl(bytes32 node) external view returns (uint72 _ttl) {
        _ttl = records[node].ttl;
    }

    /**
     * @dev Returns whether a record has been imported to the registry.
     * @param node The specified node.
     * @return Bool if record exists
     */
    function recordExists(bytes32 node) external view returns (bool) {
        return _exists(uint256(node));
    }

    /// ----- PUBLIC FUNCTIONS ----- ///

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

    /// TODO Documentation
    function _setBaseURI(string calldata baseURI_) internal {
        baseURI = baseURI_;
        emit NewBaseURI(baseURI);
    }

    /// TODO Documentation
    function _setDefaultResolver(address _resolver) internal {
        require(_resolver != address(0), "Zero address");
        defaultResolver = _resolver;
        emit NewDefaultResolver(defaultResolver);
    }

    /// @notice Internal function to transfer a token
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

    // TODO Documentation
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

    /**
     * @dev Sets the record for a node.
     * @param node The node to update.
     * @param _resolver The address of the resolver.
     * @param _ttl The TTL in seconds.
     */
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

    /**
     * @dev Sets the resolver address for the specified node.
     * @param node The node to update.
     * @param _resolver The address of the resolver.
     */
    function _setResolver(bytes32 node, address _resolver) internal {
        records[node].resolver = _resolver;
        emit NewResolver(node, _resolver);
    }

    /**
     * @dev Sets the TTL for the specified node.
     * @param node The node to update.
     * @param _ttl The TTL in seconds.
     */
    function _setTTL(bytes32 node, uint72 _ttl) internal {
        records[node].ttl = _ttl;
        emit NewTTL(node, _ttl);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    /// ----- PRIVATE FUNCTIONS ----- ///

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

    function _namehash(
        string[] calldata labels
    ) private pure returns (bytes32 node, bytes32 parentNode) {
        for (uint256 i = labels.length; i > 0; i--) {
            parentNode = node;
            node = _namehash(parentNode, labels[i - 1]);
        }
    }

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
