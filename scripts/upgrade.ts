import * as fs from 'fs';
import * as path from 'path';
import { ethers, upgrades, network } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

import { ResolverRegistry } from '../typechain-types';
import { getSelectors, AddressesByNetwork } from '../utils';
import * as C from './data/deployConstants';

function getAddresses(): AddressesByNetwork {
  return JSON.parse(
    fs.readFileSync(path.resolve(__dirname, 'data', 'addresses.json'), 'utf8'),
  );
}

// eslint-disable-next-line no-unused-vars
function writeAddresses(
  addresses: AddressesByNetwork,
  networkName: string
) {
  console.log('\n----- Writing addresses to file -----');

  const currentAddresses: AddressesByNetwork = addresses;
  currentAddresses[networkName] = addresses[networkName];

  fs.writeFileSync(
    path.resolve(__dirname, 'data', 'addresses.json'),
    JSON.stringify(currentAddresses, null, 4)
  );

  console.log('----- Addresses written to file -----\n');
}

// eslint-disable-next-line no-unused-vars
async function deployModules(
  deployer: HardhatEthersSigner,
  contractNames: string[],
  networkName: string
): Promise<AddressesByNetwork> {
  console.log('\n----- Deploying contracts -----\n');

  const instances: AddressesByNetwork = getAddresses();

  for (const contractName of contractNames) {
    const ContractFactory = await ethers.getContractFactory(contractName);
    const contractImplementation = await ContractFactory.connect(
      deployer
    ).deploy();

    const contractSelectorsNew = getSelectors(ContractFactory.interface);

    console.log(
      `Contract ${contractName} deployed to ${contractImplementation.address}`
    );

    instances[networkName].modules[contractName].address =
      await contractImplementation.getAddress();
    instances[networkName].modules[contractName].selectors =
      contractSelectorsNew;
  }

  console.log('\n----- Contracts deployed -----');

  return instances;
}

// eslint-disable-next-line no-unused-vars
async function addModules(
  deployer: HardhatEthersSigner,
  contractNames: string[],
  networkName: string
): Promise<AddressesByNetwork> {
  const instances: AddressesByNetwork = getAddresses();

  const resolverRegistryInstance = await ethers.getContractAt(
    'ResolverRegistry',
    instances[C.networkName].modules.ResolverRegistry.address
  ) as unknown as ResolverRegistry;

  const contractsNameImpl = Object.keys(instances[networkName].modules)
    .filter((contractName) => contractNames.includes(contractName))
    .map((contractName) => {
      return {
        name: contractName,
        implementation:
          instances[networkName].modules[contractName].address
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
  deployer: HardhatEthersSigner,
  contractName: string,
  networkName: string
): Promise<AddressesByNetwork> {
  const instances = getAddresses();

  const resolverRegistryInstance = await ethers.getContractAt(
    'ResolverRegistry',
    instances[C.networkName].modules.ResolverRegistry.address
  ) as unknown as ResolverRegistry;

  const contractAddressOld =
    instances[networkName].modules[contractName].address;
  const contractSelectorsOld =
    instances[networkName].modules[contractName].selectors;

  console.log(`\n----- Deploying ${contractName} module -----\n`);

  const ContractFactory = await ethers.getContractFactory(contractName);
  const contractImplementation = await ContractFactory.connect(
    deployer
  ).deploy();

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
        await contractImplementation.getAddress(),
        contractSelectorsOld,
        contractSelectorsNew
      )
  ).wait();

  console.log(`----- Module ${contractName} updated -----`);

  instances[networkName].modules[contractName].address =
    await contractImplementation.getAddress();
  instances[networkName].modules[contractName].selectors = contractSelectorsNew;

  return instances;
}

// eslint-disable-next-line no-unused-vars
async function upgradeContract(
  deployer: HardhatEthersSigner,
  contractName: string,
  networkName: string,
  forceImport?: boolean
): Promise<AddressesByNetwork> {
  const instances: AddressesByNetwork = getAddresses();

  const ContractFactory = await ethers.getContractFactory(contractName, deployer);
  const oldProxyAddress = instances[networkName].contracts[contractName].proxy;

  console.log(`\n----- Upgrading contract ${contractName} -----\n`);

  if (forceImport) {
    const contractFactoryOld = await ethers.getContractFactory(
      `${contractName}Old`,
      deployer
    );

    await upgrades.forceImport(oldProxyAddress, contractFactoryOld, {
      kind: 'uups'
    });
  }

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

  console.log(`----- Contract ${contractName} upgraded to ${await upgrades.erc1967.getImplementationAddress(await upgradedProxy.getAddress())} -----`);

  instances[networkName].contracts[contractName].implementation =
    await upgrades.erc1967.getImplementationAddress(await upgradedProxy.getAddress());

  return instances;
}

async function main() {
  let [deployer, user1] = await ethers.getSigners();
  let currentNetwork = network.name;

  if (currentNetwork === 'localhost') {
    currentNetwork = 'polygon';

    // 0x1741eC2915Ab71Fc03492715b5640133dA69420B Deployer
    // 0x8E58b98d569B0679713273c5105499C249e9bC84 Amoy
    deployer = await ethers.getImpersonatedSigner(
      '0x1741eC2915Ab71Fc03492715b5640133dA69420B'
    );

    await user1.sendTransaction({
      to: deployer.address,
      value: ethers.parseEther('100')
    });
  }

  const instances1 = await updateModule(deployer, 'VehicleIdResolver', currentNetwork);
  writeAddresses(instances1, currentNetwork);

  const instances2 = await upgradeContract(deployer, 'DcnManager', currentNetwork);
  writeAddresses(instances2, currentNetwork);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});