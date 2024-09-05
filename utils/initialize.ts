import { Wallet } from 'ethers';
import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

import { getSelectors } from '.';
import { ResolverRegistry } from '../typechain-types';

export async function initialize(
    deployer: Wallet | HardhatEthersSigner,
    ...contracts: string[]
): Promise<any[]> {
    const instances: any[] = [];

    // Deploy Resolver Implementation
    const ResolverFactory = await ethers.getContractFactory('ResolverRegistry');
    const resolverImplementation = await ResolverFactory.connect(
        deployer
    ).deploy();

    const resolver = await ethers.getContractAt(
        'ResolverRegistry',
        await resolverImplementation.getAddress()
    ) as unknown as ResolverRegistry;

    const contractSelectors = getSelectors(ResolverFactory.interface);

    await resolver
        .connect(deployer)
        .addModule(await resolverImplementation.getAddress(), contractSelectors);

    instances.push(resolver);

    for (const contractName of contracts) {
        const ContractFactory = await ethers.getContractFactory(contractName);
        const contractImplementation = await ContractFactory.connect(
            deployer
        ).deploy();

        const contractSelectors = getSelectors(ContractFactory.interface);

        await resolver
            .connect(deployer)
            .addModule(await contractImplementation.getAddress(), contractSelectors);

        instances.push(
            await ethers.getContractAt(contractName, await resolver.getAddress())
        );
    }

    return instances;
}