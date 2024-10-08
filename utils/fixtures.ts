import { ethers, upgrades, tracer } from 'hardhat';

import { C, initialize } from '../utils';
import {
    MockDimoToken,
    MockVehicleId,
    MockDcnRegistry,
    PriceManager,
    DcnManager,
    DcnRegistry,
    ResolverRegistry,
    VehicleIdResolver,
    NameResolver,
    Shared,
    Multicall
} from '../typechain-types';

export async function setupBasic() {
    upgrades.silenceWarnings();
    const [deployer, admin, nonAdmin, nonManager, user1, user2, foundation] = await ethers.getSigners();

    let resolverInstance: ResolverRegistry;
    let vehicleIdResolverInstance: VehicleIdResolver;
    let nameResolverInstance: NameResolver;
    let sharedInstance: Shared;
    let multicallInstance: Multicall;
    [
        resolverInstance,
        vehicleIdResolverInstance,
        nameResolverInstance,
        sharedInstance,
        multicallInstance
    ] = await initialize(deployer, 'VehicleIdResolver', 'NameResolver', 'Shared', 'Multicall');

    const MockDimoTokenFactory = await ethers.getContractFactory('MockDimoToken');
    const PriceManager = await ethers.getContractFactory('PriceManager');
    const DcnManagerFactory = await ethers.getContractFactory('DcnManager');
    const DcnRegistryFactory = await ethers.getContractFactory('DcnRegistry');
    const mockDimoToken = await upgrades.deployProxy(MockDimoTokenFactory, [], { initializer: false, kind: "uups" }) as unknown as MockDimoToken;
    const dcnManager = await upgrades.deployProxy(DcnManagerFactory, [], { initializer: false, kind: "uups" }) as unknown as DcnManager;
    const dcnRegistry = await upgrades.deployProxy(DcnRegistryFactory, [], { initializer: false, kind: "uups" }) as unknown as DcnRegistry;
    const priceManager = await upgrades.deployProxy(PriceManager, [], { initializer: false, kind: "uups" }) as unknown as PriceManager;

    await priceManager.connect(deployer).initialize(C.MINTING_COST);

    await dcnManager.connect(deployer).initialize(
        await mockDimoToken.getAddress(),
        await dcnRegistry.getAddress(),
        await priceManager.getAddress(),
        await resolverInstance.getAddress(),
        foundation.address
    );
    await dcnRegistry.connect(deployer).initialize(
        C.DCN_REGISTRY_NFT_NAME,
        C.DCN_REGISTRY_NFT_SYMBOL,
        C.DCN_REGISTRY_NFT_BASE_URI,
        await resolverInstance.getAddress()
    );
    await resolverInstance.connect(deployer).grantRole(C.ADMIN_ROLE, admin.address);

    await sharedInstance.connect(admin).setFoundationAddress(foundation.address);
    await sharedInstance.connect(admin).setDimoToken(await mockDimoToken.getAddress());
    await sharedInstance.connect(admin).setDcnManager(await dcnManager.getAddress());
    await sharedInstance.connect(admin).setDcnRegistry(await dcnRegistry.getAddress());

    await dcnManager.connect(deployer).grantRole(C.TLD_MINTER_ROLE, admin.address);
    await dcnManager.connect(deployer).grantRole(C.ADMIN_ROLE, admin.address);
    await dcnManager.connect(deployer).grantRole(C.MINTER_ROLE, admin.address);

    await dcnRegistry.connect(deployer).grantRole(C.ADMIN_ROLE, admin.address);
    await dcnRegistry.connect(deployer).grantRole(C.MINTER_ROLE, admin.address);
    await dcnRegistry.connect(deployer).grantRole(C.MANAGER_ROLE, await dcnManager.getAddress());

    tracer.nameTags[deployer.address] = 'Deployer';
    tracer.nameTags[admin.address] = 'Admin';
    tracer.nameTags[nonAdmin.address] = 'Non Admin';
    tracer.nameTags[user1.address] = 'User1';
    tracer.nameTags[user2.address] = 'User2';
    tracer.nameTags[foundation.address] = 'Foundation';

    tracer.nameTags[await dcnManager.getAddress()] = 'DCN Manager';
    tracer.nameTags[await dcnRegistry.getAddress()] = 'DCN Registry';
    tracer.nameTags[await priceManager.getAddress()] = 'Price Manager';
    tracer.nameTags[await mockDimoToken.getAddress()] = 'Mock Dimo Token';

    return {
        deployer,
        admin,
        nonAdmin,
        nonManager,
        user1,
        user2,
        foundation,
        mockDimoToken,
        dcnManager,
        dcnRegistry,
        resolverInstance,
        vehicleIdResolverInstance,
        nameResolverInstance,
        sharedInstance,
        multicallInstance
    };
}

export async function setupBasicRegistryMock() {
    upgrades.silenceWarnings();
    const [deployer, admin, nonAdmin, user1, user2, foundation, dcnMockManager] = await ethers.getSigners();

    let resolverInstance: ResolverRegistry;
    let vehicleIdResolverInstance: VehicleIdResolver;
    let sharedInstance: Shared;
    [resolverInstance, vehicleIdResolverInstance, sharedInstance] = await initialize(deployer, 'VehicleIdResolver', 'Shared');

    const MockDimoTokenFactory = await ethers.getContractFactory('MockDimoToken');
    const DcnRegistryFactory = await ethers.getContractFactory('DcnRegistry');
    const mockDimoToken = await upgrades.deployProxy(MockDimoTokenFactory, [], { initializer: false, kind: "uups" }) as unknown as MockDimoToken;
    const dcnRegistry = await upgrades.deployProxy(DcnRegistryFactory, [], { initializer: false, kind: "uups" }) as unknown as DcnRegistry;

    await dcnRegistry.connect(deployer).initialize(
        C.DCN_REGISTRY_NFT_NAME,
        C.DCN_REGISTRY_NFT_SYMBOL,
        C.DCN_REGISTRY_NFT_BASE_URI,
        await resolverInstance.getAddress()
    );
    await resolverInstance.connect(deployer).grantRole(C.ADMIN_ROLE, admin.address);

    await sharedInstance.connect(admin).setFoundationAddress(foundation.address);
    await sharedInstance.connect(admin).setDimoToken(await mockDimoToken.getAddress());
    await sharedInstance.connect(admin).setDcnManager(dcnMockManager.address);
    await sharedInstance.connect(admin).setDcnRegistry(await dcnRegistry.getAddress());

    await dcnRegistry.connect(deployer).grantRole(C.ADMIN_ROLE, admin.address);
    await dcnRegistry.connect(deployer).grantRole(C.MINTER_ROLE, admin.address);
    await dcnRegistry.connect(deployer).grantRole(C.MANAGER_ROLE, dcnMockManager.address);

    tracer.nameTags[deployer.address] = 'Deployer';
    tracer.nameTags[admin.address] = 'Admin';
    tracer.nameTags[nonAdmin.address] = 'Non Admin';
    tracer.nameTags[user1.address] = 'User1';
    tracer.nameTags[user2.address] = 'User2';
    tracer.nameTags[foundation.address] = 'Foundation';

    tracer.nameTags[dcnMockManager.address] = 'DCN Mock Manager';
    tracer.nameTags[await dcnRegistry.getAddress()] = 'DCN Registry';
    tracer.nameTags[await mockDimoToken.getAddress()] = 'Mock Dimo Token';

    return {
        deployer,
        admin,
        nonAdmin,
        user1,
        user2,
        foundation,
        mockDimoToken,
        dcnMockManager,
        dcnRegistry,
        resolverInstance,
        vehicleIdResolverInstance
    };
}

export async function mocks() {
    const MockDimoTokenFactory = await ethers.getContractFactory('MockDimoToken');
    const mockDimoToken = await upgrades.deployProxy(MockDimoTokenFactory, [], { initializer: false, kind: "uups" }) as unknown as MockDimoToken;
    const MockVehicleIdFactory = await ethers.getContractFactory('MockVehicleId');
    const mockVehicleId = await upgrades.deployProxy(MockVehicleIdFactory, [], { initializer: false, kind: "uups" }) as unknown as MockVehicleId;
    const MockDcnRegistryFactory = await ethers.getContractFactory('MockDcnRegistry');
    const mockDcnRegistry = await upgrades.deployProxy(MockDcnRegistryFactory, [], { initializer: false, kind: "uups" }) as unknown as MockDcnRegistry;

    tracer.nameTags[await mockVehicleId.getAddress()] = 'Mock Vehicle Id';
    tracer.nameTags[await mockDimoToken.getAddress()] = 'Mock Dimo Token';
    tracer.nameTags[await mockDcnRegistry.getAddress()] = 'Mock DCN Registry';

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
        .mintTld(vars.admin.address, C.MOCK_TLD, C.ONE_YEAR);

    await vars.mockDimoToken
        .connect(vars.user1)
        .mint(C.ONE_MILLION);
    await vars.mockDimoToken
        .connect(vars.user1)
        .approve(await vars.dcnManager.getAddress(), C.ONE_MILLION);

    return { ...vars };
}

export async function setupVehicleMinted() {
    const vars = await setupTldMinted();

    const VehicleIdFactory = await ethers.getContractFactory('MockVehicleId');
    const vehicleIdInstance = await upgrades.deployProxy(VehicleIdFactory, [], { initializer: false, kind: "uups" }) as unknown as MockVehicleId;

    await vars.vehicleIdResolverInstance.connect(vars.admin).setVehicleIdProxyAddress(await vehicleIdInstance.getAddress());

    await vehicleIdInstance.connect(vars.user1).mint(C.MOCK_VEHICLE_TOKEN_ID);

    tracer.nameTags[await vehicleIdInstance.getAddress()] = 'Vehicle Id';

    return { ...vars, vehicleIdInstance };
}