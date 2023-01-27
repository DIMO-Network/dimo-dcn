// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./interfaces/IDimo.sol";
import "./interfaces/IDCNRegistry.sol";

import "hardhat/console.sol";

contract DCNManager is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 constant TLD_MINTER_ROLE = keccak256("TLD_MINTER_ROLE");

    IDimo public dimoToken;
    IDCNRegistry public dcnRegistry;
    uint256 public mintingCost;
    address public foundation;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        IDimo _dimoToken,
        IDCNRegistry _dcnRegistry,
        uint256 _mintingCost,
        address _foundation
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        dimoToken = _dimoToken;
        dcnRegistry = _dcnRegistry;
        mintingCost = _mintingCost;
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
    function mint(
        address to,
        string[] calldata labels,
        uint256 _duration
    ) external {
        dcnRegistry.mint(to, labels, address(0), _duration);
        dimoToken.transferFrom(msg.sender, foundation, _duration * mintingCost);
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
    // function claim

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
