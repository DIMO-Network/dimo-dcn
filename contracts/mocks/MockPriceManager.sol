// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title MockPriceManager
/// @dev Mocks the PriceManager to be used in tests
contract MockPriceManager is UUPSUpgradeable {
    uint256 public basePrice;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function setBasePrice(uint256 newBasePrice) external {
        basePrice = newBasePrice;
    }

    function getPrice(uint256 duration) external view returns (uint256 price) {
        price = basePrice * duration;
    }

    function _authorizeUpgrade(address newImplementation) internal override {}
}
