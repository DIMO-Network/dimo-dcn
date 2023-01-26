// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ADMIN_ROLE} from "../shared/Roles.sol";

import "@solidstate/contracts/access/access_control/AccessControlInternal.sol";

contract Multicall is AccessControlInternal {
    function multiDelegateCall(
        bytes[] calldata data
    ) external onlyRole(ADMIN_ROLE) returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint i = 0; i < data.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(
                data[i]
            );
            require(success);
            results[i] = result;
        }
        return results;
    }

    function multiStaticCall(
        bytes[] calldata data
    ) external view returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint i = 0; i < data.length; i++) {
            (bool success, bytes memory result) = address(this).staticcall(
                data[i]
            );
            require(success);
            results[i] = result;
        }
        return results;
    }
}
