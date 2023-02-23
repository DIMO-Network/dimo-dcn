// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./interfaces/IDimo.sol";
import "./interfaces/IDcnRegistry.sol";
import "./interfaces/IPriceManager.sol";
import "./interfaces/IResolver.sol";

import "hardhat/console.sol";

contract DcnManager is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 constant TLD_MINTER_ROLE = keccak256("TLD_MINTER_ROLE");

    IDimo public dimoToken;
    IDcnRegistry public dcnRegistry;
    IPriceManager public priceManager;
    IResolver public resolver;
    address public foundation;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        IDimo _dimoToken,
        IDcnRegistry _dcnRegistry,
        IPriceManager _priceManager,
        IResolver _resolver,
        address _foundation
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        dimoToken = _dimoToken;
        dcnRegistry = _dcnRegistry;
        priceManager = _priceManager;
        resolver = _resolver;
        foundation = _foundation;
    }

    // TODO Documentation
    /// @notice Mints a top level domain (e.g. .dimo)
    function mintTLD(
        address to,
        string calldata label,
        uint256 _duration
    ) external onlyRole(TLD_MINTER_ROLE) {
        dcnRegistry.mintTLD(to, label, address(0), _duration);
    }

    // TODO Documentation
    // _duration is in seconds, $25 per year -> $25/(60*60*24*365)
    function mint(
        address to,
        string[] calldata labels,
        uint256 duration,
        uint256 vehicleId
    ) external {
        dimoToken.transferFrom(
            msg.sender,
            foundation,
            priceManager.getPrice(duration)
        );
        bytes32 node = dcnRegistry.mint(to, labels, address(0), duration);
        // TODO Call resolver
        if (vehicleId != 0) {
            resolver.setVehicleId(node, vehicleId);
        }
    }

    // TODO Documentation
    function setResolver(
        bytes32 node,
        address _resolver
    ) external onlyRole(ADMIN_ROLE) {
        dcnRegistry.setResolver(node, _resolver);
    }

    // TODO Documentation
    function setExpiration(
        bytes32 node,
        uint256 _duration
    ) external onlyRole(ADMIN_ROLE) {
        dcnRegistry.setExpiration(node, _duration);
    }

    /// TODO
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
        // TODO pay
        // TODO call resolver
        if (vehicleId != 0) {
            resolver.setVehicleId(node, vehicleId);
        } else {
            resolver.resetVehicleId(node, vehicleId);
        }
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
