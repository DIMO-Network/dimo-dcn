import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { C, initialize } from '../utils';
import { ResolverRegistry, Shared } from '../typechain-types';

describe('Shared', function () {
    async function setup() {
        const [deployer, admin, nonAdmin, foundation] = await ethers.getSigners();

        let resolverInstance: ResolverRegistry;
        let sharedInstance: Shared;
        [resolverInstance, , sharedInstance] = await initialize(deployer, 'VehicleIdResolver', 'Shared');

        await resolverInstance.grantRole(C.ADMIN_ROLE, admin.address);

        return {
            nonAdmin,
            foundation,
            sharedInstance
        };
    }

    describe('setFoundationAddress', () => {
        context('Error handling', () => {
            it('Should revert if caller does not have the ADMIN_ROLE', async () => {
                const { nonAdmin, sharedInstance, foundation } = await loadFixture(setup);

                await expect(
                    sharedInstance
                        .connect(nonAdmin)
                        .setFoundationAddress(foundation.address)
                ).to.be.revertedWith(
                    `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.ADMIN_ROLE
                    }`
                );
            });
        });
    });

    describe('setDimoToken', () => {
        context('Error handling', () => {
            it('Should revert if caller does not have the ADMIN_ROLE', async () => {
                const { nonAdmin, sharedInstance, foundation } = await loadFixture(setup);

                await expect(
                    sharedInstance
                        .connect(nonAdmin)
                        .setDimoToken(foundation.address)
                ).to.be.revertedWith(
                    `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.ADMIN_ROLE
                    }`
                );
            });
        });
    });

    describe('setDcnRegistry', () => {
        context('Error handling', () => {
            it('Should revert if caller does not have the ADMIN_ROLE', async () => {
                const { nonAdmin, sharedInstance, foundation } = await loadFixture(setup);

                await expect(
                    sharedInstance
                        .connect(nonAdmin)
                        .setDcnRegistry(foundation.address)
                ).to.be.revertedWith(
                    `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.ADMIN_ROLE
                    }`
                );
            });
        });
    });

    describe('setDcnManager', () => {
        context('Error handling', () => {
            it('Should revert if caller does not have the ADMIN_ROLE', async () => {
                const { nonAdmin, sharedInstance, foundation } = await loadFixture(setup);

                await expect(
                    sharedInstance
                        .connect(nonAdmin)
                        .setDcnManager(foundation.address)
                ).to.be.revertedWith(
                    `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.ADMIN_ROLE
                    }`
                );
            });
        });
    });
});
