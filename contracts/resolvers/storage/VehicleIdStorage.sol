// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @title VehicleIdStorage
/// @notice Storage of the VehicleId Resolver contract
library VehicleIdStorage {
    bytes32 internal constant VEHICLE_ID_STORAGE_SLOT =
        keccak256("ResolverRegistry.VehicleId.storage");

    struct Storage {
        address idProxyAddress;
        mapping(bytes32 => uint256) vehicleIds;
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