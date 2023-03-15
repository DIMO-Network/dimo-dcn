// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

/// @title SharedStorage
/// @notice Storage of for shared data
library SharedStorage {
    bytes32 internal constant SHARED_STORAGE_SLOT =
        keccak256("ResolverRegistry.Shared.storage");

    struct Storage {
        address foundation;
        address dimoToken;
        address dcnRegistry;
        address dcnManager;
    }

    /* solhint-disable no-inline-assembly */
    function getStorage() internal pure returns (Storage storage s) {
        bytes32 slot = SHARED_STORAGE_SLOT;
        assembly {
            s.slot := slot
        }
    }
    /* solhint-enable no-inline-assembly */
}