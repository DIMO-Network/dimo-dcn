// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./IDCNRegistry.sol";

contract DCNMinter is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 constant TLD_MINTER_ROLE = keccak256("TLD_MINTER_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() external initializer {
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(
        address to,
        string[] calldata labels
    ) external onlyRole(TLD_MINTER_ROLE) {
        //     (uint256 tokenId,) = _namehash(labels);
        //     _mint(to, tokenId);
    }

    /// @notice Mints a top level domain (e.g. .dimo)
    function mintTLD(
        address to,
        string calldata label
    ) external onlyRole(TLD_MINTER_ROLE) {
        // TODO Check valid tokenId || check namehash(label)
        // uint256 tokenId = _namehash(uint256(0x0), label);
        // _mint(to, tokenId);
        // TODO register record
    }

    function _namehash(
        uint256 tokenId,
        string calldata label
    ) internal pure returns (uint256) {
        require(bytes(label).length != 0, "MintingManager: LABEL_EMPTY");
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        tokenId,
                        keccak256(abi.encodePacked(label))
                    )
                )
            );
    }

    function _namehash(
        string[] calldata labels
    ) internal pure returns (uint256 tokenId, uint256 parentId) {
        for (uint256 i = labels.length; i > 0; i--) {
            parentId = tokenId;
            tokenId = _namehash(parentId, labels[i - 1]);
        }
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
