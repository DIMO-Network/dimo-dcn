import * as fs from 'fs';
import * as path from 'path';
import { ethers, upgrades } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { DcnManager, DcnRegistry, ResolverRegistry, Shared } from '../typechain-types';
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
    { name: 'VehicleIdResolver', args: [] }
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

  instances[C.networkName].resolvers.ResolverRegistry.address =
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

    instances[C.networkName].resolvers[contractNameArg.name].address =
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
        contractAddresses[C.networkName].resolvers.ResolverRegistry.address
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
      contractAddresses[C.networkName].resolvers.ResolverRegistry.address,
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
    contractAddresses[C.networkName].resolvers.ResolverRegistry.address
  ) as ResolverRegistry;

  const instances: ContractAddressesByNetwork = JSON.parse(
    JSON.stringify(contractAddresses)
  );

  const contractsNameImpl = Object.keys(
    contractAddresses[C.networkName].resolvers
  ).map((contractName) => {
    return {
      name: contractName,
      implementation:
        contractAddresses[C.networkName].resolvers[contractName].address
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

    instances[C.networkName].resolvers[contract.name].selectors =
      contractSelectors;

    console.log(`Module ${contract.name} added`);
  }

  console.log('\n----- Modules Added -----');

  return instances;
}

async function setup(deployer: SignerWithAddress) {
  const sharedInstance = await ethers.getContractAt(
    'Shared',
    contractAddresses[C.networkName].resolvers.ResolverRegistry.address
  ) as Shared;

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
    contractAddresses[C.networkName].resolvers.ResolverRegistry.address
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