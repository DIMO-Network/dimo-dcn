// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @title NameStorage
/// @notice Storage of the Name Resolver contract
library NameStorage {
    bytes32 internal constant NAME_STORAGE_SLOT =
        keccak256("ResolverRegistry.Name.storage");

    struct Storage {
        mapping(bytes32 => string) names;
    }

    /* solhint-disable no-inline-assembly */
    function getStorage() internal pure returns (Storage storage s) {
        bytes32 slot = NAME_STORAGE_SLOT;
        assembly {
            s.slot := slot
        }
    }
    /* solhint-enable no-inline-assembly */
}