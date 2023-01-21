import * as fs from 'fs';
import * as path from 'path';
import { ethers, upgrades } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { ResolverRegistry } from '../typechain-types';
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

async function deployResolvers(
  deployer: SignerWithAddress,
  resolverRegistryName: string
): Promise<ContractAddressesByNetwork> {
  console.log('\n----- Deploying contracts -----\n');

  const contractNameArgs: any[] = [
    // { name: '', args: [] }
  ];

  const instances: ContractAddressesByNetwork = JSON.parse(
    JSON.stringify(contractAddresses)
  );

  // Deploy DIMORegistry Implementation
  const DIMORegistry = await ethers.getContractFactory(resolverRegistryName);
  const resolverRegistryImplementation = await DIMORegistry.connect(
    deployer
  ).deploy();
  await resolverRegistryImplementation.deployed();

  console.log(
    `Contract ${resolverRegistryName} deployed to ${resolverRegistryImplementation.address}`
  );

  instances[C.networkName].resolvers[resolverRegistryName].address =
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

  const contractNameArgs = [
    {
      name: 'DCNRegistry',
      args: [
        C.DCN_REGISTRY_NFT_NAME,
        C.DCN_REGISTRY_NFT_SYMBOL,
        C.DCN_REGISTRY_NFT_BASE_URI,
        contractAddresses[C.networkName].resolvers.ResolverRegistry.address
      ]
    },
  ];

  const instances: ContractAddressesByNetwork = JSON.parse(
    JSON.stringify(contractAddresses)
  );

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

  console.log('\n----- Contracts deployed -----');

  return instances;
}

async function addResolver(
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

  console.log('\n----- Adding resolvers -----\n');

  for (const contract of contractsNameImpl) {
    const ContractFactory = await ethers.getContractFactory(contract.name);

    const contractSelectors = getSelectors(ContractFactory.interface);

    await (
      await resolverRegistryInstance
        .connect(deployer)
        .addResolver(contract.implementation, contractSelectors)
    ).wait();

    instances[C.networkName].resolvers[contract.name].selectors =
      contractSelectors;

    console.log(`Module ${contract.name} added`);
  }

  console.log('\n----- Resolvers Added -----');

  return instances;
}

async function grantRoles(deployer: SignerWithAddress) {
  // TODO
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const resolvers = await deployResolvers(deployer, "ResolverRegistry");
  writeAddresses(resolvers, C.networkName);
  const contractInstances = await deployContracts(deployer);
  writeAddresses(contractInstances, C.networkName);

  const instancesWithSelectors = await addResolver(deployer);
  writeAddresses(instancesWithSelectors, C.networkName);

  // await grantRoles(deployer);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});