// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @title IResolver
/// @notice Interface of ResolverRegistry and its modules
interface IResolver {
    /// ----- ResolverRegistry ----- ///

    function updateModule(
        address oldImplementation,
        address newImplementation,
        bytes4[] calldata oldSelectors,
        bytes4[] calldata newSelectors
    ) external;

    function addModule(
        address implementation,
        bytes4[] calldata selectors
    ) external;

    function removeModule(
        address implementation,
        bytes4[] calldata selectors
    ) external;

    /// ----- Vehicle ID Resolver ----- ///

    function setVehicleIdProxyAddress(address addr) external;

    function setVehicleId(bytes32 node, uint256 _vehicleId) external;

    function resetVehicleId(bytes32 node, uint256 _vehicleId) external;

    function vehicleId(bytes32 node) external view returns (uint256 _vehicleId);

    function nodeByVehicleId(
        uint256 _vehicleId
    ) external view returns (bytes32 _node);
}
