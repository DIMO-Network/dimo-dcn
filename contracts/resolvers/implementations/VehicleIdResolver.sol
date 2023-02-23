// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../storage/VehicleIdStorage.sol";
import "../../interfaces/INFT.sol";
import "../../interfaces/IDcnRegistry.sol";
import "../storage/SharedStorage.sol";
import {ADMIN_ROLE} from "../shared/Roles.sol";

import "@solidstate/contracts/access/access_control/AccessControlInternal.sol";

contract VehicleIdResolver is AccessControlInternal {
    event VehicleIdProxySet(address indexed proxy);
    event VehicleIdChanged(bytes32 indexed node, uint256 indexed _vehicleId);

    /// @notice Sets the Vehicle Id proxy address
    /// @dev Only an admin can set the address
    /// @param addr The address of the proxy
    function setVehicleIdProxyAddress(
        address addr
    ) external onlyRole(ADMIN_ROLE) {
        require(addr != address(0), "Non zero address");
        VehicleIdStorage.getStorage().idProxyAddress = addr;

        emit VehicleIdProxySet(addr);
    }

    /// @notice Sets the address associated with an DCN node
    /// May only be called by the owner of that node in the DCN registry
    /// @param node The node to update
    /// @param _vehicleId The vehicle ID to be set
    function setVehicleId(bytes32 node, uint256 _vehicleId) external {
        SharedStorage.Storage storage s = SharedStorage.getStorage();
        VehicleIdStorage.Storage storage vs = VehicleIdStorage.getStorage();

        require(s.dcnManager == msg.sender, "Only DCN Manager");
        require(
            IDcnRegistry(s.dcnRegistry).ownerOf(uint256(node)) ==
                INFT(vs.idProxyAddress).ownerOf(_vehicleId),
            "Owners does not match"
        );
        require(vs.nodeToVehicleIds[node] == 0, "Node already resolved");
        require(
            vs.vehicleIdToNodes[_vehicleId] == 0x00,
            "Vehicle Id already resolved"
        );

        vs.nodeToVehicleIds[node] = _vehicleId;
        vs.vehicleIdToNodes[_vehicleId] = node;

        emit VehicleIdChanged(node, _vehicleId);
    }

    /// @notice Returns the vehicle ID associated with a DCN node
    /// @param node The DCN node to query
    /// @return _vehicleId The associated vehicle ID
    function vehicleId(
        bytes32 node
    ) external view returns (uint256 _vehicleId) {
        _vehicleId = VehicleIdStorage.getStorage().nodeToVehicleIds[node];
    }

    /// @notice Returns the DCN node associated with a vehicle ID
    /// @param _vehicleId The vehicle ID to query
    /// @return _node The associated DCN node
    function nodeByVehicleId(
        uint256 _vehicleId
    ) external view returns (bytes32 _node) {
        _node = VehicleIdStorage.getStorage().vehicleIdToNodes[_vehicleId];
    }
}
