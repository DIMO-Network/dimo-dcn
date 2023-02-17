import { Wallet } from 'ethers';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { getSelectors } from '.';
import { ResolverRegistry } from '../typechain-types';

export async function initialize(
    deployer: Wallet | SignerWithAddress,
    ...contracts: string[]
): Promise<any[]> {
    const instances: any[] = [];

    // Deploy Resolver Implementation
    const ResolverFactory = await ethers.getContractFactory('ResolverRegistry');
    const resolverImplementation = await ResolverFactory.connect(
        deployer
    ).deploy();
    await resolverImplementation.deployed();

    const resolver = await ethers.getContractAt(
        'ResolverRegistry',
        resolverImplementation.address
    ) as ResolverRegistry;

    const contractSelectors = getSelectors(ResolverFactory.interface);

    await resolver
        .connect(deployer)
        .addModule(resolverImplementation.address, contractSelectors);

    instances.push(resolver);

    for (const contractName of contracts) {
        const ContractFactory = await ethers.getContractFactory(contractName);
        const contractImplementation = await ContractFactory.connect(
            deployer
        ).deploy();
        await contractImplementation.deployed();

        const contractSelectors = getSelectors(ContractFactory.interface);

        await resolver
            .connect(deployer)
            .addModule(contractImplementation.address, contractSelectors);

        instances.push(
            await ethers.getContractAt(contractName, resolver.address)
        );
    }

    return instances;
}