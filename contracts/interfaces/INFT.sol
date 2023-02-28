// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @title INFT
/// @notice Interface of a generic NFT
interface INFT {
    function safeMint(address to) external returns (uint256);

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;

    function setApprovalForAll(address operator, bool approved_) external;

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external;

    function ownerOf(uint256 tokenId) external view returns (address owner);

    function exists(uint256 tokenId) external view returns (bool);

    function isApprovedForAll(address owner, address operator)
        external
        view
        returns (bool);
}
