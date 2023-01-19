// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * The DCN registry contract.
 */
contract DCNRegistry is
    Initializable,
    ERC721Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Logged when the resolver for a node changes.
    event NewResolver(bytes32 indexed node, address resolver);

    // Logged when the TTL of a node changes
    event NewTTL(bytes32 indexed node, uint72 ttl);

    struct Record {
        address resolver;
        uint72 ttl;
    }

    address public defaultResolver;
    mapping(bytes32 => Record) records;

    // Permits modifications only by the owner of the specified node.
    modifier authorized(bytes32 node) {
        require(_isApprovedOrOwner(msg.sender, uint256(node)));
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string calldata _name,
        string calldata _symbol,
        address _defaultResolver
    ) external initializer {
        // records[0x0].owner = msg.sender;
        __ERC721_init_unchained(_name, _symbol);
        __AccessControl_init_unchained();
        __UUPSUpgradeable_init_unchained();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        defaultResolver = _defaultResolver;

        _mint(msg.sender, uint256(0x00));
        _setRecord(0x00, address(0), ~uint72(0));
    }

    function setDefaultResolver(
        address _resolver
    ) external onlyRole(ADMIN_ROLE) {
        require(_resolver != address(0), "Zero address");
        defaultResolver = _resolver;
    }

    /**
     * @dev Returns the address of the resolver for the specified node.
     * @param node The specified node.
     * @return address of the resolver.
     */
    function resolver(bytes32 node) external view returns (address) {
        return
            records[node].resolver == address(0)
                ? defaultResolver
                : records[node].resolver;
    }

    /**
     * @dev Returns the TTL of a node, and any records associated with it.
     * @param node The specified node.
     * @return ttl of the node.
     */
    function ttl(bytes32 node) external view returns (uint72) {
        return records[node].ttl;
    }

    /**
     * @dev Returns whether a record has been imported to the registry.
     * @param node The specified node.
     * @return Bool if record exists
     */
    function recordExists(bytes32 node) external view returns (bool) {
        return _exists(uint256(node));
    }

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
     * @dev Sets the resolver address for the specified node.
     * @param node The node to update.
     * @param _resolver The address of the resolver.
     */
    function _setResolver(
        bytes32 node,
        address _resolver
    ) internal authorized(node) {
        emit NewResolver(node, _resolver);
        records[node].resolver = _resolver;
    }

    /**
     * @dev Sets the TTL for the specified node.
     * @param node The node to update.
     * @param _ttl The TTL in seconds.
     */
    function _setTTL(bytes32 node, uint72 _ttl) internal authorized(node) {
        emit NewTTL(node, _ttl);
        records[node].ttl = _ttl;
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

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

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
