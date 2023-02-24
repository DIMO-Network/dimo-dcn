// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";

interface IDcnRegistry is IERC721Upgradeable, IAccessControlUpgradeable {
    function setBaseURI(string calldata baseURI_) external;

    function setDefaultResolver(address _resolver) external;

    function mintTLD(
        address to,
        string calldata label,
        address _resolver,
        uint256 duration
    ) external;

    function mint(
        address to,
        string[] calldata labels,
        address _resolver,
        uint256 duration
    ) external returns (bytes32 node);

    function claim(
        address to,
        bytes32 node,
        address _resolver,
        uint256 duration
    ) external;

    function renew(bytes32 node, uint256 duration) external;

    function setRecord(
        bytes32 node,
        address _resolver,
        uint256 duration
    ) external;

    function setResolver(bytes32 node, address _resolver) external;

    function setExpiration(bytes32 node, uint256 duration) external;

    function resolver(bytes32 node) external view returns (address);

    function expires(bytes32 node) external view returns (uint256);

    function recordExists(bytes32 node) external view returns (bool);
}
