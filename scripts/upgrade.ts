import * as fs from 'fs';
import * as path from 'path';
import { ethers, upgrades } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { ResolverRegistry, DcnManager } from '../typechain-types';
import { getSelectors, ContractAddressesByNetwork } from '../utils';
import * as C from './data/deployConstants';
import addressesJSON from './data/addresses.json';

const contractAddresses: ContractAddressesByNetwork = addressesJSON;

// eslint-disable-next-line no-unused-vars
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

// eslint-disable-next-line no-unused-vars
async function deployModules(
  deployer: SignerWithAddress,
  contractNames: string[],
  networkName: string
): Promise<ContractAddressesByNetwork> {
  console.log('\n----- Deploying contracts -----\n');

  const instances: ContractAddressesByNetwork = JSON.parse(
    JSON.stringify(contractAddresses)
  );

  for (const contractName of contractNames) {
    const ContractFactory = await ethers.getContractFactory(contractName);
    const contractImplementation = await ContractFactory.connect(
      deployer
    ).deploy();
    await contractImplementation.deployed();

    const contractSelectorsNew = getSelectors(ContractFactory.interface);

    console.log(
      `Contract ${contractName} deployed to ${contractImplementation.address}`
    );

    instances[networkName].modules[contractName].address =
      contractImplementation.address;
    instances[networkName].modules[contractName].selectors =
      contractSelectorsNew;
  }

  console.log('\n----- Contracts deployed -----');

  return instances;
}

// eslint-disable-next-line no-unused-vars
async function addModules(
  deployer: SignerWithAddress,
  contractNames: string[],
  networkName: string
): Promise<ContractAddressesByNetwork> {
  const resolverRegistryInstance = await ethers.getContractAt(
    'ResolverRegistry',
    contractAddresses[C.networkName].modules.ResolverRegistry.address
  ) as ResolverRegistry;

  const instances: ContractAddressesByNetwork = JSON.parse(
    JSON.stringify(contractAddresses)
  );

  const contractsNameImpl = Object.keys(contractAddresses[networkName].modules)
    .filter((contractName) => contractNames.includes(contractName))
    .map((contractName) => {
      return {
        name: contractName,
        implementation:
          contractAddresses[networkName].modules[contractName].address
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

    instances[networkName].modules[contract.name].selectors = contractSelectors;

    console.log(`Module ${contract.name} added`);
  }

  console.log('\n----- Modules Added -----');

  return instances;
}

// eslint-disable-next-line no-unused-vars
async function updateModule(
  deployer: SignerWithAddress,
  contractName: string,
  networkName: string
): Promise<ContractAddressesByNetwork> {
  const resolverRegistryInstance = await ethers.getContractAt(
    'ResolverRegistry',
    contractAddresses[C.networkName].modules.ResolverRegistry.address
  ) as ResolverRegistry;

  const instances: ContractAddressesByNetwork = JSON.parse(
    JSON.stringify(contractAddresses)
  );

  const contractAddressOld =
    instances[networkName].modules[contractName].address;
  const contractSelectorsOld =
    instances[networkName].modules[contractName].selectors;

  console.log(`\n----- Deploying ${contractName} module -----\n`);

  const ContractFactory = await ethers.getContractFactory(contractName);
  const contractImplementation = await ContractFactory.connect(
    deployer
  ).deploy();
  await contractImplementation.deployed();

  console.log(
    `Contract ${contractName} deployed to ${contractImplementation.address}`
  );

  console.log(`\n----- Updating ${contractName} module -----\n`);

  const contractSelectorsNew = getSelectors(ContractFactory.interface);

  console.log(contractAddressOld);
  console.log(contractSelectorsOld);
  console.log(contractImplementation.address);
  console.log(contractSelectorsNew);
  await (
    await resolverRegistryInstance
      .connect(deployer)
      .updateModule(
        contractAddressOld,
        contractImplementation.address,
        contractSelectorsOld,
        contractSelectorsNew
      )
  ).wait();

  console.log(`----- Module ${contractName} updated -----`);

  instances[networkName].modules[contractName].address =
    contractImplementation.address;
  instances[networkName].modules[contractName].selectors = contractSelectorsNew;

  return instances;
}

// eslint-disable-next-line no-unused-vars
async function upgradeContract(
  deployer: SignerWithAddress,
  contractName: string,
  networkName: string,
  forceImport?: boolean
): Promise<ContractAddressesByNetwork> {
  const contractFactoryOld = await ethers.getContractFactory(
    'DcnManagerOld',
    deployer
  );
  const ContractFactory = await ethers.getContractFactory(contractName, deployer);

  const instances: ContractAddressesByNetwork = JSON.parse(
    JSON.stringify(contractAddresses)
  );

  const oldProxyAddress = instances[networkName].contracts[contractName].proxy;

  console.log(`\n----- Upgrading contract ${contractName} -----\n`);

  if (forceImport) {
    await upgrades.forceImport(oldProxyAddress, contractFactoryOld, {
      kind: 'uups'
    });
  }

  console.log(await upgrades.erc1967.getImplementationAddress(oldProxyAddress));

  await upgrades.validateImplementation(ContractFactory, {
    kind: 'uups'
  });
  const upgradedProxy = await upgrades.upgradeProxy(
    oldProxyAddress,
    ContractFactory,
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
  const currentNetwork = 'polygon';

  // const deployer = await ethers.getImpersonatedSigner(
  //   '0x1741eC2915Ab71Fc03492715b5640133dA69420B'
  // );

  // await user1.sendTransaction({
  //   to: deployer.address,
  //   value: ethers.utils.parseEther('100')
  // });

  const instances = await updateModule(deployer, 'VehicleIdResolver', currentNetwork);
  writeAddresses(instances, currentNetwork);

  const dcnManagerInstance = await ethers.getContractAt(
    'DcnManager',
    contractAddresses[currentNetwork].contracts.DcnManager.proxy
  ) as DcnManager;

  await dcnManagerInstance.connect(deployer).grantRole(C.UPGRADER_ROLE, deployer.address);

  const instances2 = await upgradeContract(deployer, 'DcnManager', currentNetwork);
  writeAddresses(instances2, currentNetwork);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});