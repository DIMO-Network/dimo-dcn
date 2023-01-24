// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../storage/RegistryStorage.sol";
import {DEFAULT_ADMIN_ROLE} from "../shared/Roles.sol";
import {MANAGER_RESOLVER_ROLE} from "../shared/Roles.sol";

import "@solidstate/contracts/access/access_control/AccessControl.sol";

/// @title ResolverRegistry
/// @notice Entry point of all calls to Resolvers and resolver-module manager
contract ResolverRegistry is AccessControl {
    event ResolverAdded(address indexed resolverAddr, bytes4[] selectors);
    event ResolverRemoved(address indexed resolverAddr, bytes4[] selectors);
    event ResolverUpdated(
        address indexed oldImplementation,
        address indexed newImplementation,
        bytes4[] oldSelectors,
        bytes4[] newSelectors
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_RESOLVER_ROLE, msg.sender);
    }

    /// @notice pass a call to a resolver
    /* solhint-disable no-complex-fallback, payable-fallback, no-inline-assembly */
    fallback() external {
        address implementation = RegistryStorage.getStorage().implementations[
            msg.sig
        ];
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(
                gas(),
                implementation,
                0,
                calldatasize(),
                0,
                0
            )
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    /* solhint-enable no-complex-fallback, payable-fallback, no-inline-assembly */

    /// @notice Updates resolver
    /// @dev oldImplementation should be registered
    /// @param oldImplementation address of the resolver to remove
    /// @param newImplementation address of the resolver to register
    /// @param oldSelectors old function signatures list
    /// @param newSelectors new function signatures list
    function updateResolver(
        address oldImplementation,
        address newImplementation,
        bytes4[] calldata oldSelectors,
        bytes4[] calldata newSelectors
    ) external onlyRole(MANAGER_RESOLVER_ROLE) {
        _removeResolver(oldImplementation, oldSelectors);
        _addResolver(newImplementation, newSelectors);
        emit ResolverUpdated(
            oldImplementation,
            newImplementation,
            oldSelectors,
            newSelectors
        );
    }

    /// @notice Adds a new resolver
    /// @dev function selector should not have been registered
    /// @param implementation address of the implementation
    /// @param selectors selectors of the implementation contract
    function addResolver(address implementation, bytes4[] calldata selectors)
        external
        onlyRole(MANAGER_RESOLVER_ROLE)
    {
        _addResolver(implementation, selectors);
        emit ResolverAdded(implementation, selectors);
    }

    /// @notice Removes a resolver and supported functions
    /// @dev function selector should not exist
    /// @param implementation implementation address
    /// @param selectors function selectors
    function removeResolver(address implementation, bytes4[] calldata selectors)
        external
        onlyRole(MANAGER_RESOLVER_ROLE)
    {
        _removeResolver(implementation, selectors);
        emit ResolverRemoved(implementation, selectors);
    }

    /// @notice Adds a new resolver
    /// @dev function selector should not have been registered
    /// @param implementation address of the implementation
    /// @param selectors selectors of the implementation contract
    function _addResolver(address implementation, bytes4[] calldata selectors)
        private
    {
        RegistryStorage.Storage storage s = RegistryStorage.getStorage();
        require(
            s.selectorsHash[implementation] == 0x0,
            "Implementation already exists"
        );

        for (uint256 i = 0; i < selectors.length; i++) {
            require(
                s.implementations[selectors[i]] == address(0),
                "Selector already registered"
            );
            s.implementations[selectors[i]] = implementation;
        }
        bytes32 hash = keccak256(abi.encode(selectors));
        s.selectorsHash[implementation] = hash;
    }

    /// @notice Removes a resolver and supported functions
    /// @dev function selector should not exist
    /// @param implementation implementation address
    /// @param selectors function selectors
    function _removeResolver(address implementation, bytes4[] calldata selectors)
        private
    {
        RegistryStorage.Storage storage s = RegistryStorage.getStorage();
        bytes32 hash = keccak256(abi.encode(selectors));
        require(
            s.selectorsHash[implementation] == hash,
            "Invalid selector list"
        );

        for (uint256 i = 0; i < selectors.length; i++) {
            require(
                s.implementations[selectors[i]] == implementation,
                "Selector registered in another resolver"
            );
            s.implementations[selectors[i]] = address(0);
        }
        s.selectorsHash[implementation] = 0x0;
    }
}