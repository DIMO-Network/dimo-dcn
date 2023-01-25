// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";

interface IDCNRegistry is IERC721Upgradeable, IAccessControlUpgradeable {
    function setBaseURI(string calldata baseURI_) external;

    function setDefaultResolver(address _resolver) external;

    function mint(
        address to,
        string[] calldata labels,
        address _resolver,
        uint72 _ttl
    ) external;

    function setRecord(bytes32 node, address _resolver, uint72 _ttl) external;

    function setResolver(bytes32 node, address _resolver) external;

    function setTTL(bytes32 node, uint72 _ttl) external;

    function resolver(bytes32 node) external view returns (address);

    function ttl(bytes32 node) external view returns (uint72);

    function recordExists(bytes32 node) external view returns (bool);
}
