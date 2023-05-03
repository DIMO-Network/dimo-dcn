// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "../storage/VehicleIdStorage.sol";
import "../../interfaces/INFT.sol";
import "../../interfaces/IDcnRegistry.sol";
import "../storage/SharedStorage.sol";
import {ADMIN_ROLE} from "../shared/Roles.sol";

import "@solidstate/contracts/access/access_control/AccessControlInternal.sol";

/// @title VehicleIdResolver
/// @notice Resolver to map DCN nodes to vehicle IDs
contract VehicleIdResolver is AccessControlInternal {
    event VehicleIdProxySet(address indexed proxy);
    event VehicleIdChanged(bytes32 indexed node, uint256 indexed vehicleId_);

    /// @notice Sets the Vehicle Id proxy address
    /// @dev Only an admin can set the address
    /// @param addr The address of the proxy
    function setVehicleIdProxyAddress(
        address addr
    ) external onlyRole(ADMIN_ROLE) {
        require(addr != address(0), "Non zero address");
        VehicleIdStorage.getStorage().vehicleIdProxyAddress = addr;

        emit VehicleIdProxySet(addr);
    }

    /// @notice Sets the address associated with an DCN node
    /// @param node The node to update
    /// @param vehicleId_ The vehicle ID to be set
    function setVehicleId(bytes32 node, uint256 vehicleId_) external {
        VehicleIdStorage.Storage storage vs = VehicleIdStorage.getStorage();
        address nodeOwner = IDcnRegistry(SharedStorage.getStorage().dcnRegistry)
            .ownerOf(uint256(node));

        require(
            msg.sender == SharedStorage.getStorage().dcnManager ||
                msg.sender == nodeOwner,
            "Not authorized"
        );
        require(
            nodeOwner == INFT(vs.vehicleIdProxyAddress).ownerOf(vehicleId_),
            "Owners does not match"
        );

        vs.nodeToVehicleIds[node] = vehicleId_;
        vs.vehicleIdToNodes[vehicleId_] = node;

        emit VehicleIdChanged(node, vehicleId_);
    }

    /// @notice Resets the pair node-vehicleId to default values
    /// @param node The node to be reset
    /// @param vehicleId_ The vehicle ID to be reset
    function resetVehicleId(bytes32 node, uint256 vehicleId_) external {
        VehicleIdStorage.Storage storage vs = VehicleIdStorage.getStorage();
        address nodeOwner = IDcnRegistry(SharedStorage.getStorage().dcnRegistry)
            .ownerOf(uint256(node));

        require(
            msg.sender == SharedStorage.getStorage().dcnManager ||
                msg.sender == nodeOwner,
            "Not authorized"
        );
        require(
            nodeOwner == INFT(vs.vehicleIdProxyAddress).ownerOf(vehicleId_),
            "Owners does not match"
        );

        vs.nodeToVehicleIds[node] = 0;
        vs.vehicleIdToNodes[vehicleId_] = 0x00;
    }

    /// @notice Returns the vehicle ID associated with a DCN node
    /// @param node The DCN node to query
    /// @return vehicleId_ The associated vehicle ID
    function vehicleId(
        bytes32 node
    ) external view returns (uint256 vehicleId_) {
        vehicleId_ = VehicleIdStorage.getStorage().nodeToVehicleIds[node];
    }

    /// @notice Returns the DCN node associated with a vehicle ID
    /// @param vehicleId_ The vehicle ID to query
    /// @return node The associated DCN node
    function nodeByVehicleId(
        uint256 vehicleId_
    ) external view returns (bytes32 node) {
        node = VehicleIdStorage.getStorage().vehicleIdToNodes[vehicleId_];
    }
}
