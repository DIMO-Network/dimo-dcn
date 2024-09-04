// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./interfaces/IDimo.sol";
import "./interfaces/IDcnRegistry.sol";
import "./interfaces/IPriceManager.sol";
import "./interfaces/IResolver.sol";

error InvalidArrayLength();
error InvalidLength();
error InvalidCharacter();
error DisallowedLabel();

/// @title DcnManager
/// @notice Contract to manage DCN minting, price and vehicle ID resolution
contract DcnManager is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 constant TLD_MINTER_ROLE = keccak256("TLD_MINTER_ROLE");
    bytes32 constant MINTER_ROLE = keccak256("MINTER_ROLE");

    IDimo public dimoToken;
    IDcnRegistry public dcnRegistry;
    IPriceManager public priceManager;
    IResolver public resolver;
    address public foundation;
    mapping(string label => bool disallowed) private disallowedLabels;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        IDimo dimoToken_,
        IDcnRegistry dcnRegistry_,
        IPriceManager priceManager_,
        IResolver resolver_,
        address foundation_
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        dimoToken = dimoToken_;
        dcnRegistry = dcnRegistry_;
        priceManager = priceManager_;
        resolver = resolver_;
        foundation = foundation_;
    }

    /// @notice Set allowed/disallowed to a list of labels
    /// @dev To ensure consistency, all allowed/disallowed labels must be lowercase
    /// @dev Caller must have the admin role
    /// @param labels List of labels to be allowed/disallowed
    /// @param disallowed Whether a label should be allowed or disallowed
    function setDisallowedLabels(
        string[] calldata labels,
        bool[] calldata disallowed
    ) external onlyRole(ADMIN_ROLE) {
        uint256 arrayLength = labels.length;
        if(arrayLength != disallowed.length) revert InvalidArrayLength();

        for (uint i = 0; i < arrayLength; i++) {
            disallowedLabels[labels[i]] = disallowed[i];
        }
    }

    /// @notice Mints a top level domain (e.g. .dimo)
    /// @dev Only a TLD minter can mint
    /// @param to The token owner
    /// @param label Label to become a TLD
    /// @param duration Period before name expires (in seconds)
    function mintTld(
        address to,
        string calldata label,
        uint256 duration
    ) external onlyRole(TLD_MINTER_ROLE) {
        bytes32 node = dcnRegistry.mintTld(to, label, address(0), duration);
        resolver.setName(node, label);
    }

    /// @notice Admin function to mint a DNC node without restrictions
    /// @dev To mint ['a', 'b'], ['b'] has to exist
    /// @param to Token owner
    /// @param labels List of labels (e.g ['label1', 'tld'] -> label1.tld)
    /// @param duration Period before name expires (in seconds)
    function mintByAdmin(
        address to,
        string[] memory labels,
        uint256 duration
    ) external onlyRole(MINTER_ROLE) {
        bytes32 node = dcnRegistry.mint(to, labels, address(0), duration);
        resolver.setName(node, _concat(labels));
    }

    /// @notice Mints a DNC node and maps vehicle ID if set
    /// @notice The price of the minting is based on the duration
    /// @dev To mint ['a', 'b'], ['b'] has to exist
    /// @param to Token owner
    /// @param labels List of labels (e.g ['label1', 'tld'] -> label1.tld)
    /// @param duration Period before name expires (in seconds)
    /// @param vehicleId The vehicle ID to be associated to the DCN node
    function mint(
        address to,
        string[] memory labels,
        uint256 duration,
        uint256 vehicleId
    ) external {
        require(labels.length == 2, "Only 2 labels");

        labels[0] = validateLabel(labels[0]);

        dimoToken.transferFrom(
            msg.sender,
            foundation,
            priceManager.getPrice(duration)
        );

        bytes32 node = dcnRegistry.mint(to, labels, address(0), duration);

        if (vehicleId != 0) {
            resolver.setVehicleId(node, vehicleId);
        }

        resolver.setName(node, _concat(labels));
    }

    /// @notice Sets the resolver address for the specified node
    /// @dev Caller must have the admin role
    /// @param node The node to update
    /// @param resolver_ The address of the resolver to be set
    function setResolver(
        bytes32 node,
        address resolver_
    ) external onlyRole(ADMIN_ROLE) {
        dcnRegistry.setResolver(node, resolver_);
    }

    /// @notice Sets the expiration for the specified node
    /// @dev Caller must have the admin role
    /// @param node The node to update
    /// @param duration Period before name expires (in seconds)
    function setExpiration(
        bytes32 node,
        uint256 duration
    ) external onlyRole(ADMIN_ROLE) {
        dcnRegistry.setExpiration(node, duration);
    }

    /// @notice Renews the expiration of a node
    /// @notice Caller pays for the extension
    /// @dev The node owner must be match `to`
    /// @param to The node owner
    /// @param node The node to be renewed
    /// @param duration The duration to extend the expiration (in seconds)
    function renew(address to, bytes32 node, uint256 duration) external {
        require(dcnRegistry.ownerOf(uint256(node)) == to, "Not node owner");

        dimoToken.transferFrom(
            msg.sender,
            foundation,
            priceManager.getPrice(duration)
        );

        dcnRegistry.renew(node, duration);
    }

    /// @notice Claims the ownership of a node if it is expired
    /// @notice Caller also pays for the duration
    /// @notice Caller may also set map the vehicle ID
    /// @dev The claimer is able to reset the duration
    /// @param to The new node owner
    /// @param node The node to be claimed
    /// @param duration Period before name expires (in seconds)
    function claim(
        address to,
        bytes32 node,
        uint256 duration,
        uint256 vehicleId
    ) external {
        dimoToken.transferFrom(
            msg.sender,
            foundation,
            priceManager.getPrice(duration)
        );

        dcnRegistry.claim(to, node, address(0), duration);

        if (vehicleId != 0) {
            resolver.setVehicleId(node, vehicleId);
        } else {
            resolver.resetVehicleId(node, vehicleId);
        }
    }

    /// @dev Validates a label to be recorded
    /// @dev Length must be between 3 and 15 characters
    /// @dev All characters must be [A-Z][a-z][0-9]
    /// @dev All characters are converted to lowercase if needed
    /// @dev Label must not be disallowed
    /// @param label_ Label to be verified
    function validateLabel(
        string memory label_
    ) public view returns (string memory label) {
        bytes memory b = bytes(label_);
        uint256 labelLength = b.length;

        if (labelLength < 3) revert InvalidLength();
        if (labelLength > 15) revert InvalidLength();

        bytes1 bChar;
        for (uint256 i = 0; i < labelLength; i++) {
            bChar = b[i];

            // A-Z
            if (bChar > 0x40 && bChar < 0x5B) {
                // To lowercase
                b[i] = bChar | 0x20;
            } else if (
                !(bChar > 0x2F && bChar < 0x3A) && // 9-0
                !(bChar > 0x60 && bChar < 0x7B) && // a-z
                !(bChar == 0x5F) // _
            ) {
                revert InvalidCharacter();
            }
        }

        label = string(b);

        if (disallowedLabels[label]) revert DisallowedLabel();
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    /// @dev Concatenates an array of strings in the format
    /// ['string1','string2'] -> 'string1.string2
    /// @param str Array of strings to be concatenated
    function _concat(
        string[] memory str
    ) private pure returns (string memory output) {
        uint256 length = str.length;
        output = str[0];

        for (uint256 i = 1; i < length; i++) {
            output = string(abi.encodePacked(output, ".", str[i]));
        }
    }
}
