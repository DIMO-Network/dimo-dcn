// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title MockDimoToken
/// @dev Mocks the DIMO token to be used in tests
contract MockDimoToken is ERC20Upgradeable, UUPSUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function mint(uint256 amount) external {
        _mint(msg.sender, amount);
    }

    function _authorizeUpgrade(address newImplementation) internal override {}
}
