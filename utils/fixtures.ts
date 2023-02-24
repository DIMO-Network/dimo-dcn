import { ethers, upgrades, tracer } from 'hardhat';

import { C, initialize } from '../utils';
import {
    MockDimoToken,
    MockVehicleId,
    MockDcnRegistry,
    MockPriceManager,
    DcnManager,
    DcnRegistry,
    ResolverRegistry,
    VehicleIdResolver,
    Shared
} from '../typechain-types';

export async function setupBasic() {
    upgrades.silenceWarnings();
    const [deployer, admin, nonAdmin, user1, user2, foundation] = await ethers.getSigners();

    let resolverInstance: ResolverRegistry;
    let vehicleIdResolverInstance: VehicleIdResolver;
    let sharedInstance: Shared;
    [resolverInstance, vehicleIdResolverInstance, sharedInstance] = await initialize(deployer, 'VehicleIdResolver', 'Shared');

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
        resolverInstance.address,
        foundation.address
    );
    await dcnRegistry.connect(deployer).initialize(
        C.DCN_REGISTRY_NFT_NAME,
        C.DCN_REGISTRY_NFT_SYMBOL,
        C.DCN_REGISTRY_NFT_BASE_URI,
        resolverInstance.address,
        dcnManager.address
    );
    await resolverInstance.connect(deployer).grantRole(C.ADMIN_ROLE, admin.address);

    await sharedInstance.connect(admin).setFoundationAddress(foundation.address);
    await sharedInstance.connect(admin).setDimoToken(mockDimoToken.address);
    await sharedInstance.connect(admin).setDcnManager(dcnManager.address);
    await sharedInstance.connect(admin).setDcnRegistry(dcnRegistry.address);

    await dcnManager.connect(deployer).grantRole(C.TLD_MINTER_ROLE, admin.address);
    await dcnManager.connect(deployer).grantRole(C.ADMIN_ROLE, admin.address);

    await dcnRegistry.connect(deployer).grantRole(C.ADMIN_ROLE, admin.address);
    await dcnRegistry.connect(deployer).grantRole(C.MINTER_ROLE, admin.address);

    await mockPriceManager.connect(deployer).setBasePrice(C.MINTING_COST);

    tracer.nameTags[deployer.address] = 'Deployer';
    tracer.nameTags[admin.address] = 'Admin';
    tracer.nameTags[nonAdmin.address] = 'Non Admin';
    tracer.nameTags[user1.address] = 'User1';
    tracer.nameTags[user2.address] = 'User2';
    tracer.nameTags[foundation.address] = 'Foundation';

    tracer.nameTags[dcnManager.address] = 'DCN Manager';
    tracer.nameTags[dcnRegistry.address] = 'DCN Registry';
    tracer.nameTags[mockDimoToken.address] = 'Mock Dimo Token';
    tracer.nameTags[mockPriceManager.address] = 'Mock Price Manager';

    return {
        deployer,
        admin,
        nonAdmin,
        user1,
        user2,
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

    tracer.nameTags[mockVehicleId.address] = 'Mock Vehicle Id';
    tracer.nameTags[mockDimoToken.address] = 'Mock Dimo Token';
    tracer.nameTags[mockDcnRegistry.address] = 'Mock DCN Registry';

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
        .mintTLD(vars.admin.address, C.MOCK_TLD, C.ONE_YEAR);

    await vars.mockDimoToken
        .connect(vars.user1)
        .mint(C.ONE_MILLION);
    await vars.mockDimoToken
        .connect(vars.user1)
        .approve(vars.dcnManager.address, C.ONE_MILLION);

    return { ...vars };
}

export async function setupVehicleMinted() {
    const vars = await setupTldMinted();

    const VehicleIdFactory = await ethers.getContractFactory('MockVehicleId');
    const vehicleIdInstance = await upgrades.deployProxy(VehicleIdFactory, [], { initializer: false, kind: "uups" }) as MockVehicleId;

    await vehicleIdInstance.connect(vars.user1).mint(C.MOCK_VEHICLE_TOKEN_ID);

    tracer.nameTags[vehicleIdInstance.address] = 'Vehicle Id';

    return { ...vars, vehicleIdInstance };
}