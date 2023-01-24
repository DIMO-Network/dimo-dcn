import { ethers } from 'hardhat';

function _namehash(labels: string[]): string {
    let node = '00'.repeat(32);

    if (labels.length > 0) {
        for (let i = labels.length - 1; i >= 0; i--) {
            const labelHash = ethers.utils.keccak256(Buffer.from(labels[i]));
            node = ethers.utils.solidityKeccak256(
                ['uint256', 'uint256'],
                [node, labelHash]
            );
        }
    }

    return node;
}

export function namehash(inputName: string | string[]): string {
    let labels: string[] = [];

    if (typeof inputName === 'string' && inputName) {
        labels = inputName.split('.');
    } else {
        labels = inputName as string[];
    }

    return _namehash(labels);
}

export function getSelectors(_interface: any): Array<string> {
    return Object.keys(_interface.functions).map((item) =>
        _interface.getSighash(item)
    );
}