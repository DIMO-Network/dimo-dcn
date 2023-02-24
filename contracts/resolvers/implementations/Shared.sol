// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../storage/SharedStorage.sol";
import "../../interfaces/INFT.sol";
import {ADMIN_ROLE} from "../shared/Roles.sol";

import "@solidstate/contracts/access/access_control/AccessControlInternal.sol";

/// @title Shared
/// @notice Contract that contains recurrent information to be used among other contracts
contract Shared is AccessControlInternal {
    /// @notice Sets the foundation address
    /// @dev Only an admin can set the address
    /// @param _foundation The foundation address
    function setFoundationAddress(
        address _foundation
    ) external onlyRole(ADMIN_ROLE) {
        SharedStorage.getStorage().foundation = _foundation;
    }

    /// @notice Sets the DIMO token address
    /// @dev Only an admin can set the token address
    /// @param _dimoToken The DIMO token address
    function setDimoToken(address _dimoToken) external onlyRole(ADMIN_ROLE) {
        SharedStorage.getStorage().dimoToken = _dimoToken;
    }

    /// @notice Sets the DCN Registry address
    /// @dev Only an admin can set the token address
    /// @param _dcnRegistry The DCN Registry address
    function setDcnRegistry(address _dcnRegistry) external onlyRole(ADMIN_ROLE) {
        SharedStorage.getStorage().dcnRegistry = _dcnRegistry;
    }

    /// @notice Sets the DCN Manager address
    /// @dev Only an admin can set the token address
    /// @param _dcnManager The DCN Manager address
    function setDcnManager(address _dcnManager) external onlyRole(ADMIN_ROLE) {
        SharedStorage.getStorage().dcnManager = _dcnManager;
    }
}
