// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

/// @title VehicleIdStorage
/// @notice Storage of the VehicleId Resolver contract
library VehicleIdStorage {
    bytes32 internal constant VEHICLE_ID_STORAGE_SLOT =
        keccak256("ResolverRegistry.VehicleId.storage");

    struct Storage {
        address vehicleIdProxyAddress;
        mapping(bytes32 => uint256) nodeToVehicleIds;
        mapping(uint256 => bytes32) vehicleIdToNodes;
    }

    /* solhint-disable no-inline-assembly */
    function getStorage() internal pure returns (Storage storage s) {
        bytes32 slot = VEHICLE_ID_STORAGE_SLOT;
        assembly {
            s.slot := slot
        }
    }
    /* solhint-enable no-inline-assembly */
}