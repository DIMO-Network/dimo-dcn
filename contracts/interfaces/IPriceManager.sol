// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

/// @title IPriceManager
/// @notice Interface of PriceManger
interface IPriceManager {
    function setBasePrice(uint256 newBasePrice) external;

    function getPrice(uint256 duration) external view returns (uint256 price);
}
