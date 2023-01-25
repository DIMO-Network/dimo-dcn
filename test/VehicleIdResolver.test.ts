import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';

import { C, initialize, namehash } from '../utils';
import { ResolverRegistry, VehicleIdResolver, MockVehicleId } from '../typechain-types';

describe('VehicleResolver', function () {
    async function setup() {
        const MOCK_TOKEN_ID = 1;
        const [deployer, admin, nonAdmin, user1] = await ethers.getSigners();

        let resolverInstance: ResolverRegistry;
        let vehicleIdResolverInstance: VehicleIdResolver;
        [resolverInstance, vehicleIdResolverInstance] = await initialize(deployer, 'VehicleIdResolver');

        const MockVehicleIdFactory = await ethers.getContractFactory('MockVehicleId');
        const mockVehicleId = await upgrades.deployProxy(MockVehicleIdFactory) as MockVehicleId;

        await resolverInstance.grantRole(C.ADMIN_ROLE, admin.address);
        await vehicleIdResolverInstance.connect(admin).setVehicleIdProxyAddress(mockVehicleId.address);
        await mockVehicleId.connect(user1).mint(MOCK_TOKEN_ID);

        return { deployer, admin, nonAdmin, user1, resolverInstance, vehicleIdResolverInstance, mockVehicleId, MOCK_TOKEN_ID };
    }

    describe('setVehicleIdProxyAddress', () => {
        context('Error handling', () => {
            it('Should revert if caller does not have the ADMIN_ROLE', async () => {
                const { nonAdmin, vehicleIdResolverInstance, mockVehicleId } = await loadFixture(setup);

                await expect(
                    vehicleIdResolverInstance
                        .connect(nonAdmin)
                        .setVehicleIdProxyAddress(mockVehicleId.address)
                ).to.be.revertedWith(
                    `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.ADMIN_ROLE
                    }`
                );
            });
            it('Should revert if proxy is zero address', async () => {
                const { admin, vehicleIdResolverInstance } = await loadFixture(setup);

                await expect(
                    vehicleIdResolverInstance
                        .connect(admin)
                        .setVehicleIdProxyAddress(C.ZERO_ADDRESS)
                ).to.be.revertedWith('Non zero address');
            });
        });

        context('Events', () => {
            it('Should emit VehicleIdProxySet event with correct params', async () => {
                const { admin, vehicleIdResolverInstance, mockVehicleId } = await loadFixture(setup);

                await expect(
                    vehicleIdResolverInstance
                        .connect(admin)
                        .setVehicleIdProxyAddress(mockVehicleId.address)
                )
                    .to.emit(vehicleIdResolverInstance, 'VehicleIdProxySet')
                    .withArgs(mockVehicleId.address);
            });
        });
    });

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
                const { admin, vehicleIdResolverInstance, mockVehicleId } = await loadFixture(setup);
                await mockVehicleId.connect(admin).mint(2);

                await vehicleIdResolverInstance
                    .connect(admin)
                    .setVehicleId(mockTldNamehash, 2);

                expect(await vehicleIdResolverInstance.vehicleId(mockTldNamehash)).to.equal(2);
            });
        });

        context('Events', () => {
            it('Should emit VehicleIdChanged event with correct params', async () => {
                const { admin, vehicleIdResolverInstance, mockVehicleId } = await loadFixture(setup);
                await mockVehicleId.connect(admin).mint(2);

                await expect(
                    vehicleIdResolverInstance
                        .connect(admin)
                        .setVehicleId(mockTldNamehash, 2)
                )
                    .to.emit(vehicleIdResolverInstance, 'VehicleIdChanged')
                    .withArgs(mockTldNamehash, 2);
            });
        });
    });
});
