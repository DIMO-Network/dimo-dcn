import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { C, initialize, namehash } from '../utils';
import { ResolverRegistry, VehicleIdResolver } from '../typechain-types';

describe('DCNRegistry', function () {
    async function setup() {
        const [deployer, admin, nonAdmin, user1] = await ethers.getSigners();

        let resolverInstance: ResolverRegistry;
        let vehicleIdResolverInstance: VehicleIdResolver;
        [resolverInstance, vehicleIdResolverInstance] = await initialize(deployer, 'VehicleIdResolver');

        await resolverInstance.grantRole(C.ADMIN_ROLE, admin.address);

        return { deployer, admin, nonAdmin, user1, resolverInstance, vehicleIdResolverInstance };
    }

    describe('setVehicleId', () => {
        const mockTldNamehash = namehash(C.MOCK_TLD);

        context('Error handling', () => {
            it('Should revert if caller does not have the ADMIN_ROLE', async () => {
                const { nonAdmin, vehicleIdResolverInstance } = await loadFixture(setup);

                await expect(
                    vehicleIdResolverInstance
                        .connect(nonAdmin)
                        .setVehicleId(mockTldNamehash, 1)
                ).to.be.revertedWith(
                    `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.ADMIN_ROLE
                    }`
                );
            });
        });

        context('State', () => {
            it('Should correctly set the vehicle Id', async () => {
                const { admin, vehicleIdResolverInstance } = await loadFixture(setup);

                await vehicleIdResolverInstance
                    .connect(admin)
                    .setVehicleId(mockTldNamehash, 1);

                expect(await vehicleIdResolverInstance.vehicleId(mockTldNamehash)).to.equal(1);
            });
        });
    });
});
