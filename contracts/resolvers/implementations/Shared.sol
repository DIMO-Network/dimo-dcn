// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "../storage/SharedStorage.sol";
import "../../interfaces/INFT.sol";
import {ADMIN_ROLE} from "../shared/Roles.sol";

import "@solidstate/contracts/access/access_control/AccessControlInternal.sol";

/// @title Shared
/// @notice Contract that contains recurrent information to be used among other contracts
contract Shared is AccessControlInternal {
    /// @notice Sets the foundation address
    /// @dev Only an admin can set the address
    /// @param foundation The foundation address
    function setFoundationAddress(
        address foundation
    ) external onlyRole(ADMIN_ROLE) {
        SharedStorage.getStorage().foundation = foundation;
    }

    /// @notice Sets the DIMO token address
    /// @dev Only an admin can set the token address
    /// @param dimoToken The DIMO token address
    function setDimoToken(address dimoToken) external onlyRole(ADMIN_ROLE) {
        SharedStorage.getStorage().dimoToken = dimoToken;
    }

    /// @notice Sets the DCN Registry address
    /// @dev Only an admin can set the token address
    /// @param dcnRegistry The DCN Registry address
    function setDcnRegistry(address dcnRegistry) external onlyRole(ADMIN_ROLE) {
        SharedStorage.getStorage().dcnRegistry = dcnRegistry;
    }

    /// @notice Sets the DCN Manager address
    /// @dev Only an admin can set the token address
    /// @param dcnManager The DCN Manager address
    function setDcnManager(address dcnManager) external onlyRole(ADMIN_ROLE) {
        SharedStorage.getStorage().dcnManager = dcnManager;
    }
}
