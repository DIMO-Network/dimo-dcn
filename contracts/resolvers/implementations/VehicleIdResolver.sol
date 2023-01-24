// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../storage/VehicleIdStorage.sol";
import {ADMIN_ROLE} from "../shared/Roles.sol";

import "@solidstate/contracts/access/access_control/AccessControlInternal.sol";

contract VehicleIdResolver is AccessControlInternal {
    event VehicleIdChanged(bytes32 node, uint256 _vehicleId);

    /// @notice Sets the address associated with an DCN node
    /// May only be called by the owner of that node in the ENS registry
    /// @param node The node to update
    /// @param _vehicleId The vehicle ID to be set
    function setVehicleId(
        bytes32 node,
        uint256 _vehicleId
    ) external onlyRole(ADMIN_ROLE) {
        VehicleIdStorage.getStorage().vehicleIds[node] = _vehicleId;
        emit VehicleIdChanged(node, _vehicleId);
    }

    /// @notice Returns the address associated with an ENS node
    /// @param node The ENS node to query
    /// @return _vehicleId The associated address
    function vehicleId(
        bytes32 node
    ) external view returns (uint256 _vehicleId) {
        _vehicleId = VehicleIdStorage.getStorage().vehicleIds[node];
    }
}
