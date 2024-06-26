import { ethers, network } from 'hardhat';

import { DcnManager } from '../typechain-types';
import { AddressesByNetwork } from '../utils';
import addressesJSON from './data/addresses.json';
import { disallowedList } from './data/disallowed';

const contractAddresses: AddressesByNetwork = addressesJSON;

function cleanUpLabels(labels: string[]): string[] {
    return labels.map(label => {
        return label
            .toLowerCase() // To lower case
            .normalize('NFD') // Convert to Unicode Normalization Form, e.g. è -> e +  ̀
            .replace(/\p{Diacritic}/gu, "") // Remove accents/diatricts
            .replace(/[^A-Za-z0-9]/g, '') // Remove all remaining non-alphanumeric (including whitespaces)
    });
}

async function main() {
    const dcnManagerInstance = await ethers.getContractAt(
        'DcnManager',
        contractAddresses[network.name].contracts.DcnManager.proxy
    ) as DcnManager;

    const disallowedListCleanedUp = cleanUpLabels(disallowedList);
    const disallowed = new Array(disallowedListCleanedUp.length).fill(true);

    await dcnManagerInstance.setDisallowedLabels(disallowedListCleanedUp, disallowed);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});