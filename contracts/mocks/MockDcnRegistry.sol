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
        address _resolver,
        uint256 duration
    ) external {
        bytes32 node = _namehash(labels);
        _mintWithRecords(to, node, _resolver, duration);
    }

    function _mintWithRecords(
        address to,
        bytes32 node,
        address _resolver,
        uint256 duration
    ) private returns (uint256 _tokenId) {
        _tokenId = uint256(node);

        _mint(to, _tokenId);

        _setResolver(node, _resolver);
        _setExpiration(node, block.timestamp + duration);
    }

    function _setResolver(bytes32 node, address _resolver) private {
        records[node].resolver = _resolver;
    }

    function _setExpiration(bytes32 node, uint256 _expiration) private {
        records[node].expires = _expiration;
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
