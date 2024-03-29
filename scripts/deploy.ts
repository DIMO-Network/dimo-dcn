import * as fs from 'fs';
import * as path from 'path';
import { ethers, upgrades } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { DcnManager, DcnRegistry, ResolverRegistry, Shared, VehicleIdResolver } from '../typechain-types';
import { getSelectors, ContractAddressesByNetwork } from '../utils';
import * as C from './data/deployConstants';
import addressesJSON from './data/addresses.json';

const contractAddresses: ContractAddressesByNetwork = addressesJSON;

function writeAddresses(
  addresses: ContractAddressesByNetwork,
  networkName: string
) {
  console.log('\n----- Writing addresses to file -----');

  const currentAddresses: ContractAddressesByNetwork = contractAddresses;
  currentAddresses[networkName] = addresses[networkName];

  fs.writeFileSync(
    path.resolve(__dirname, 'data', 'addresses.json'),
    JSON.stringify(currentAddresses, null, 4)
  );

  console.log('----- Addresses written to file -----\n');
}

async function deployModules(
  deployer: SignerWithAddress
): Promise<ContractAddressesByNetwork> {
  console.log('\n----- Deploying contracts -----\n');

  const contractNameArgs: any[] = [
    { name: 'Shared', args: [] },
    { name: 'NameResolver', args: [] },
    { name: 'VehicleIdResolver', args: [] },
    { name: 'Multicall', args: [] }
  ];

  const instances: ContractAddressesByNetwork = JSON.parse(
    JSON.stringify(contractAddresses)
  );

  // Deploy ResolverRegistry Implementation
  const DIMORegistry = await ethers.getContractFactory("ResolverRegistry");
  const resolverRegistryImplementation = await DIMORegistry.connect(
    deployer
  ).deploy();
  await resolverRegistryImplementation.deployed();

  console.log(
    `Contract ResolverRegistry deployed to ${resolverRegistryImplementation.address}`
  );

  instances[C.networkName].modules.ResolverRegistry.address =
    resolverRegistryImplementation.address;

  for (const contractNameArg of contractNameArgs) {
    const ContractFactory = await ethers.getContractFactory(
      contractNameArg.name
    );
    const contractImplementation = await ContractFactory.connect(
      deployer
    ).deploy(...contractNameArg.args);
    await contractImplementation.deployed();

    console.log(
      `Contract ${contractNameArg.name} deployed to ${contractImplementation.address}`
    );

    instances[C.networkName].modules[contractNameArg.name].address =
      contractImplementation.address;
  }

  console.log('\n----- Contracts deployed -----');

  return instances;
}

async function deployContracts(
  deployer: SignerWithAddress
): Promise<ContractAddressesByNetwork> {
  console.log('\n----- Deploying contracts -----\n');

  const instances: ContractAddressesByNetwork = JSON.parse(
    JSON.stringify(contractAddresses)
  );

  const contractNameArgs = [
    {
      name: 'DcnRegistry',
      args: [
        C.DCN_REGISTRY_NFT_NAME,
        C.DCN_REGISTRY_NFT_SYMBOL,
        C.DCN_REGISTRY_NFT_BASE_URI,
        contractAddresses[C.networkName].modules.ResolverRegistry.address
      ]
    },
    {
      name: 'PriceManager',
      args: [C.PRICE_MANAGER_BASE_PRICE]
    }
  ];

  for (const contractNameArg of contractNameArgs) {
    const ContractFactory = await ethers.getContractFactory(
      contractNameArg.name,
      deployer
    );

    await upgrades.validateImplementation(ContractFactory, {
      kind: 'uups'
    });

    const contractProxy = await upgrades.deployProxy(
      ContractFactory,
      contractNameArg.args,
      {
        initializer: 'initialize',
        kind: 'uups'
      }
    );

    await contractProxy.deployed();

    console.log(
      `Contract ${contractNameArg.name} deployed to ${contractProxy.address}`
    );

    instances[C.networkName].contracts[contractNameArg.name].proxy =
      contractProxy.address;
    instances[C.networkName].contracts[contractNameArg.name].implementation =
      await upgrades.erc1967.getImplementationAddress(contractProxy.address);
  }

  // Deploying DcnManager

  const ContractFactory = await ethers.getContractFactory(
    'DcnManager',
    deployer
  );

  await upgrades.validateImplementation(ContractFactory, {
    kind: 'uups'
  });

  const contractProxy = await upgrades.deployProxy(
    ContractFactory,
    [
      C.dimoToken[C.networkName],
      instances[C.networkName].contracts.DcnRegistry.proxy,
      instances[C.networkName].contracts.PriceManager.proxy,
      contractAddresses[C.networkName].modules.ResolverRegistry.address,
      C.foundationAddress[C.networkName]
    ],
    {
      initializer: 'initialize',
      kind: 'uups'
    }
  );

  await contractProxy.deployed();

  console.log(
    `Contract DcnManager deployed to ${contractProxy.address}`
  );

  instances[C.networkName].contracts.DcnManager.proxy =
    contractProxy.address;
  instances[C.networkName].contracts.DcnManager.implementation =
    await upgrades.erc1967.getImplementationAddress(contractProxy.address);

  console.log('\n----- Contracts deployed -----');

  return instances;
}

async function addModule(
  deployer: SignerWithAddress
): Promise<ContractAddressesByNetwork> {
  const resolverRegistryInstance = await ethers.getContractAt(
    'ResolverRegistry',
    contractAddresses[C.networkName].modules.ResolverRegistry.address
  ) as ResolverRegistry;

  const instances: ContractAddressesByNetwork = JSON.parse(
    JSON.stringify(contractAddresses)
  );

  const contractsNameImpl = Object.keys(
    contractAddresses[C.networkName].modules
  ).map((contractName) => {
    return {
      name: contractName,
      implementation:
        contractAddresses[C.networkName].modules[contractName].address
    };
  });

  console.log('\n----- Adding modules -----\n');

  for (const contract of contractsNameImpl) {
    const ContractFactory = await ethers.getContractFactory(contract.name);

    const contractSelectors = getSelectors(ContractFactory.interface);

    await (
      await resolverRegistryInstance
        .connect(deployer)
        .addModule(contract.implementation, contractSelectors)
    ).wait();

    instances[C.networkName].modules[contract.name].selectors =
      contractSelectors;

    console.log(`Module ${contract.name} added`);
  }

  console.log('\n----- Modules Added -----');

  return instances;
}

async function setup(deployer: SignerWithAddress) {
  const vehicleIdResolverInstance = await ethers.getContractAt(
    'VehicleIdResolver',
    contractAddresses[C.networkName].modules.ResolverRegistry.address
  ) as VehicleIdResolver;
  const sharedInstance = await ethers.getContractAt(
    'Shared',
    contractAddresses[C.networkName].modules.ResolverRegistry.address
  ) as Shared;

  console.log('\n----- Setting vehicle ID proxy address -----');
  await vehicleIdResolverInstance.connect(deployer).setVehicleIdProxyAddress(C.dimoVehicleIdAddress[C.networkName]);
  console.log('----- Vehicle ID proxy address set -----\n');

  console.log('\n----- Setting foundation address -----');
  await sharedInstance.connect(deployer).setFoundationAddress(C.foundationAddress[C.networkName]);
  console.log('----- Foundation address set -----\n');

  console.log('\n----- Setting DIMO token address -----');
  await sharedInstance.connect(deployer).setDimoToken(C.dimoToken[C.networkName]);
  console.log('----- DIMO token address set -----\n');

  console.log('\n----- Setting DcnManager address -----');
  await sharedInstance.connect(deployer).setDcnManager(contractAddresses[C.networkName].contracts.DcnManager.proxy);
  console.log('----- DcnManager address set -----\n');

  console.log('\n----- Setting DcnRegistry address -----');
  await sharedInstance.connect(deployer).setDcnRegistry(contractAddresses[C.networkName].contracts.DcnRegistry.proxy);
  console.log('----- DcnRegistry addresse set -----\n');
}

async function grantRoles(deployer: SignerWithAddress) {
  const dcnRegistryInstance = await ethers.getContractAt(
    'DcnRegistry',
    contractAddresses[C.networkName].contracts.DcnRegistry.proxy
  ) as DcnRegistry;
  const resolverRegistryInstance = await ethers.getContractAt(
    'ResolverRegistry',
    contractAddresses[C.networkName].modules.ResolverRegistry.address
  ) as ResolverRegistry;
  const dcnManagerInstance = await ethers.getContractAt(
    'DcnManager',
    contractAddresses[C.networkName].contracts.DcnManager.proxy
  ) as DcnManager;

  console.log('\n----- Granting roles -----');

  await dcnRegistryInstance.connect(deployer).grantRole(C.ADMIN_ROLE, deployer.address);
  await dcnRegistryInstance.connect(deployer).grantRole(C.MINTER_ROLE, deployer.address);
  await dcnRegistryInstance.connect(deployer).grantRole(C.MANAGER_ROLE, contractAddresses[C.networkName].contracts.DcnManager.proxy);

  await resolverRegistryInstance.connect(deployer).grantRole(C.ADMIN_ROLE, deployer.address);

  await dcnManagerInstance.connect(deployer).grantRole(C.TLD_MINTER_ROLE, deployer.address);
  await dcnManagerInstance.connect(deployer).grantRole(C.ADMIN_ROLE, deployer.address);
  await dcnManagerInstance.connect(deployer).grantRole(C.MINTER_ROLE, deployer.address);

  console.log('----- Roles granted -----\n');
}

async function upgradeContract(
  deployer: SignerWithAddress,
  contractName: string,
  networkName: string,
  forceImport?: boolean
): Promise<ContractAddressesByNetwork> {
  // const NftFactoryOld = await ethers.getContractFactory(
  //   'AftermarketDeviceIdOld',
  //   deployer
  // );
  const NftFactory = await ethers.getContractFactory(contractName, deployer);

  const instances: ContractAddressesByNetwork = JSON.parse(
    JSON.stringify(contractAddresses)
  );

  const oldProxyAddress = instances[networkName].contracts[contractName].proxy;

  console.log('\n----- Upgrading NFT -----\n');

  // if (forceImport) {
  //   await upgrades.forceImport(oldProxyAddress, NftFactoryOld, {
  //     kind: 'uups'
  //   });
  // }

  console.log(await upgrades.erc1967.getImplementationAddress(oldProxyAddress));

  await upgrades.validateImplementation(NftFactory, {
    kind: 'uups'
  });
  const upgradedProxy = await upgrades.upgradeProxy(
    oldProxyAddress,
    NftFactory,
    {
      kind: 'uups'
    }
  );
  await upgradedProxy.deployed();
  console.log(
    await upgrades.erc1967.getImplementationAddress(upgradedProxy.address)
  );

  console.log(`----- Contract ${contractName} upgraded -----`);

  instances[networkName].contracts[contractName].implementation =
    await upgrades.erc1967.getImplementationAddress(upgradedProxy.address);

  return instances;
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const instances = await deployModules(deployer);
  writeAddresses(instances, C.networkName);
  const instancesWithSelectors = await addModule(deployer);
  writeAddresses(instancesWithSelectors, C.networkName);
  const contractInstances = await deployContracts(deployer);
  writeAddresses(contractInstances, C.networkName);

  await grantRoles(deployer);
  await setup(deployer);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});