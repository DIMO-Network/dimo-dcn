import { ethers, upgrades } from 'hardhat';

import { C, initialize } from '../utils';
import {
    MockDimoToken,
    MockVehicleId,
    MockDcnRegistry,
    MockPriceManager,
    DcnManager,
    DcnRegistry,
    ResolverRegistry,
    VehicleIdResolver
} from '../typechain-types';

export async function setupBasic() {
    upgrades.silenceWarnings();
    const [deployer, admin, nonAdmin, user1, foundation] = await ethers.getSigners();

    let resolverInstance: ResolverRegistry;
    let vehicleIdResolverInstance: VehicleIdResolver;
    [resolverInstance, vehicleIdResolverInstance] = await initialize(deployer, 'VehicleIdResolver');

    const MockDimoTokenFactory = await ethers.getContractFactory('MockDimoToken');
    const MockPriceManager = await ethers.getContractFactory('MockPriceManager');
    const DcnManagerFactory = await ethers.getContractFactory('DcnManager');
    const DcnRegistryFactory = await ethers.getContractFactory('DcnRegistry');
    const mockDimoToken = await upgrades.deployProxy(MockDimoTokenFactory, [], { initializer: false, kind: "uups" }) as MockDimoToken;
    const dcnManager = await upgrades.deployProxy(DcnManagerFactory, [], { initializer: false, kind: "uups" }) as DcnManager;
    const dcnRegistry = await upgrades.deployProxy(DcnRegistryFactory, [], { initializer: false, kind: "uups" }) as DcnRegistry;
    const mockPriceManager = await upgrades.deployProxy(MockPriceManager, [], { initializer: false, kind: "uups" }) as MockPriceManager;

    await mockPriceManager.setBasePrice(C.MINTING_COST);

    await dcnManager.connect(deployer).initialize(
        mockDimoToken.address,
        dcnRegistry.address,
        mockPriceManager.address,
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

export async function mocks() {
    const MockDimoTokenFactory = await ethers.getContractFactory('MockDimoToken');
    const mockDimoToken = await upgrades.deployProxy(MockDimoTokenFactory, [], { initializer: false, kind: "uups" }) as MockDimoToken;
    const MockVehicleIdFactory = await ethers.getContractFactory('MockVehicleId');
    const mockVehicleId = await upgrades.deployProxy(MockVehicleIdFactory, [], { initializer: false, kind: "uups" }) as MockVehicleId;
    const MockDcnRegistryFactory = await ethers.getContractFactory('MockDcnRegistry');
    const mockDcnRegistry = await upgrades.deployProxy(MockDcnRegistryFactory, [], { initializer: false, kind: "uups" }) as MockDcnRegistry;

    return {
        mockDimoToken,
        mockVehicleId,
        mockDcnRegistry
    }
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