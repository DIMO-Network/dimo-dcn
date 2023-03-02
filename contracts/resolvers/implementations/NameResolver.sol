// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../storage/NameStorage.sol";
import "../storage/SharedStorage.sol";

/// @title NameResolver
/// @notice Resolver to map DCN nodes to name strings
contract NameResolver {
    event NameChanged(bytes32 indexed node, string name_);

    /// @notice Sets the name string associated with an DCN node
    /// @param node The node to update
    /// @param name_ The name string to be set
    function setName(bytes32 node, string calldata name_) external {
        require(
            msg.sender == SharedStorage.getStorage().dcnManager,
            "Only DCN Manager"
        );

        NameStorage.getStorage().names[node] = name_;
        emit NameChanged(node, name_);
    }

    /// @notice Returns the name string associated with a DCN node
    /// @param node The DCN node to query
    /// @return name_ The associated name string
    function name(bytes32 node) external view returns (string memory name_) {
        name_ = NameStorage.getStorage().names[node];
    }
}
