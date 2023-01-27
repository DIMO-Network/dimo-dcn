import { ethers, upgrades } from 'hardhat';

import { C, initialize } from '../utils';
import { MockDimoToken, DCNManager, DCNRegistry, ResolverRegistry, VehicleIdResolver } from '../typechain-types';

export async function setupBasic() {
    upgrades.silenceWarnings();
    const [deployer, admin, nonAdmin, user1, foundation] = await ethers.getSigners();

    let resolverInstance: ResolverRegistry;
    let vehicleIdResolverInstance: VehicleIdResolver;
    [resolverInstance, vehicleIdResolverInstance] = await initialize(deployer, 'VehicleIdResolver');

    const MockDimoTokenFactory = await ethers.getContractFactory('MockDimoToken');
    const DCNManagerFactory = await ethers.getContractFactory('DCNManager');
    const DCNRegistryFactory = await ethers.getContractFactory('DCNRegistry');
    const mockDimoToken = await upgrades.deployProxy(MockDimoTokenFactory, [], { initializer: false, kind: "uups" }) as MockDimoToken;
    const dcnManager = await upgrades.deployProxy(DCNManagerFactory, [], { initializer: false, kind: "uups" }) as DCNManager;
    const dcnRegistry = await upgrades.deployProxy(DCNRegistryFactory, [], { initializer: false, kind: "uups" }) as DCNRegistry;

    await dcnManager.connect(deployer).initialize(
        mockDimoToken.address,
        dcnRegistry.address,
        C.MINTING_COST,
        foundation.address
    );
    await dcnRegistry.connect(deployer).initialize(
        C.DCN_REGISTRY_NFT_NAME,
        C.DCN_REGISTRY_NFT_SYMBOL,
        C.DCN_REGISTRY_NFT_BASE_URI,
        resolverInstance.address,
        dcnManager.address,
        C.GRACE_PERIOD
    );

    await dcnManager.connect(deployer).grantRole(C.TLD_MINTER_ROLE, admin.address);
    await dcnManager.connect(deployer).grantRole(C.ADMIN_ROLE, admin.address);

    await dcnRegistry.connect(deployer).grantRole(C.ADMIN_ROLE, admin.address);
    await dcnRegistry.connect(deployer).grantRole(C.MINTER_ROLE, admin.address);

    return {
        deployer,
        admin,
        nonAdmin,
        user1,
        foundation,
        mockDimoToken,
        dcnManager,
        dcnRegistry,
        resolverInstance,
        vehicleIdResolverInstance
    };
}

export async function setupTldMinted() {
    const vars = await setupBasic();

    await vars.dcnManager
        .connect(vars.admin)
        .mintTLD(vars.admin.address, C.MOCK_TLD, C.EXPIRATION_1_YEAR);

    await vars.mockDimoToken
        .connect(vars.user1)
        .mint(C.MAX_UINT_256);
    await vars.mockDimoToken
        .connect(vars.user1)
        .approve(vars.dcnManager.address, C.MAX_UINT_256);

    return { ...vars };
}