// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

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

    function setVehicleId(bytes32 node, uint256 vehicleId_) external;

    function resetVehicleId(bytes32 node, uint256 vehicleId_) external;

    function vehicleId(bytes32 node) external view returns (uint256 vehicleId_);

    function nodeByVehicleId(
        uint256 vehicleId_
    ) external view returns (bytes32 node);

    /// ----- Name Resolver ----- ///

    function setName(bytes32 node, string calldata name) external;

    function name(bytes32 node) external view returns (string memory name_);
}
