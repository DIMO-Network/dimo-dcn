// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title MockDcnRegistry
/// @dev Mocks the DCN Registry to be used in tests
contract MockDcnRegistry is ERC721Upgradeable, UUPSUpgradeable {
    struct Record {
        address resolver;
        uint256 expires;
    }

    mapping(bytes32 => Record) public records;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function mint(
        address to,
        string[] calldata labels,
        address resolver_,
        uint256 duration
    ) external {
        bytes32 node = _namehash(labels);
        _mintWithRecords(to, node, resolver_, duration);
    }

    function _mintWithRecords(
        address to,
        bytes32 node,
        address resolver_,
        uint256 duration
    ) private returns (uint256 tokenId_) {
        tokenId_ = uint256(node);

        _mint(to, tokenId_);

        _setResolver(node, resolver_);
        _setExpiration(node, block.timestamp + duration);
    }

    function _setResolver(bytes32 node, address resolver_) private {
        records[node].resolver = resolver_;
    }

    function _setExpiration(bytes32 node, uint256 expiration_) private {
        records[node].expires = expiration_;
    }

    function _namehash(
        string[] calldata labels
    ) private pure returns (bytes32 node) {
        for (uint256 i = labels.length; i > 0; i--) {
            node = keccak256(
                abi.encodePacked(
                    node,
                    keccak256(abi.encodePacked(labels[i - 1]))
                )
            );
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override {}
}
