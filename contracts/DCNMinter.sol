// @author Unstoppable Domains, Inc.
// @date June 16th, 2021

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract DCNMinter is Initializable, ERC721Upgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 constant TLD_MINTER_ROLE = keccak256("TLD_MINTER_ROLE");

    struct Record {
        address resolver;
        uint64 ttl;
    }

    address public defaultResolver;
    mapping(bytes32 => Record) public records;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string calldata _name,
        string calldata _symbol,
        address _defaultResolver
    ) public initializer {
        __ERC721_init_unchained(_name, _symbol);
        __AccessControl_init();

        defaultResolver = _defaultResolver;
    }

    function mint(address to, string[] calldata labels) external onlyRole(TLD_MINTER_ROLE) {
        (uint256 tokenId,) = _namehash(labels);
        _mint(to, tokenId);
    }

    /// @notice Mints a top level domain (e.g. .dimo)
    function mintTLD(address to, string calldata label) external onlyRole(TLD_MINTER_ROLE) {
        // TODO Check valid tokenId || check namehash(label)
        uint256 tokenId = _namehash(uint256(0x0), label);
        _mint(to, tokenId);
        // TODO register record
    }

    function _namehash(uint256 tokenId, string calldata label) internal pure returns (uint256) {
        require(bytes(label).length != 0, 'MintingManager: LABEL_EMPTY');
        return uint256(keccak256(abi.encodePacked(tokenId, keccak256(abi.encodePacked(label)))));
    }

    function _namehash(string[] calldata labels) internal pure returns (uint256 tokenId, uint256 parentId) {
        for (uint256 i = labels.length; i > 0; i--) {
            parentId = tokenId;
            tokenId = _namehash(parentId, labels[i - 1]);
        }
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
