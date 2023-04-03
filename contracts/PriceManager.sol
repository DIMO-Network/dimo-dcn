// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/// @title PriceManager
/// @notice Contract to manage how DCN minting price is calculated
contract PriceManager is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public basePrice;

    event BasePriceChanged(uint256 newBasePrice);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(uint256 basePrice_) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        basePrice = basePrice_;
    }

    /// @notice Sets the base price
    /// @dev Only an admin can call this function
    /// @param newBasePrice The new base price
    function setBasePrice(uint256 newBasePrice) external onlyRole(ADMIN_ROLE) {
        basePrice = newBasePrice;

        emit BasePriceChanged(newBasePrice);
    }

    /// @notice Gets the minting price given the wanted duration
    /// @param duration Duration wanted (in seconds)
    /// @return price Minting price
    function getPrice(uint256 duration) external view returns (uint256 price) {
        price = basePrice * duration;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
