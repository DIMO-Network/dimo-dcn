import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { C, initialize, namehash, mocks } from '../utils';
import { ResolverRegistry, VehicleIdResolver, Shared } from '../typechain-types';

describe('VehicleResolver', () => {
    async function setup() {
        const [deployer, admin, nonAdmin, user1, user2, foundation, mockDcnManager, nonDcnManager] = await ethers.getSigners();

        const { mockDimoToken, mockVehicleId, mockDcnRegistry } = await loadFixture(mocks);

        let resolverInstance: ResolverRegistry;
        let vehicleIdResolverInstance: VehicleIdResolver;
        let sharedInstance: Shared;
        [resolverInstance, vehicleIdResolverInstance, sharedInstance] = await initialize(deployer, 'VehicleIdResolver', 'Shared');

        await resolverInstance.grantRole(C.ADMIN_ROLE, admin.address);

        await sharedInstance.connect(admin).setFoundationAddress(foundation.address);
        await sharedInstance.connect(admin).setDimoToken(mockDimoToken.address);
        await sharedInstance.connect(admin).setDcnManager(mockDcnManager.address);
        await sharedInstance.connect(admin).setDcnRegistry(mockDcnRegistry.address);

        await vehicleIdResolverInstance.connect(admin).setVehicleIdProxyAddress(mockVehicleId.address);
        await mockVehicleId.connect(user1).mint(C.MOCK_VEHICLE_TOKEN_ID);

        return {
            deployer,
            admin,
            nonAdmin,
            user1,
            user2,
            mockDcnManager,
            nonDcnManager,
            resolverInstance,
            vehicleIdResolverInstance,
            mockVehicleId,
            mockDcnRegistry
        };
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
                        .setVehicleIdProxyAddress(ethers.constants.AddressZero)
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
            it('Should revert if caller is not the DCN Manager', async () => {
                const { user1, nonDcnManager, mockDcnRegistry, vehicleIdResolverInstance } = await loadFixture(setup);
                await mockDcnRegistry.mint(user1.address, [C.MOCK_TLD], ethers.constants.AddressZero, C.ONE_YEAR);

                await expect(
                    vehicleIdResolverInstance
                        .connect(nonDcnManager)
                        .setVehicleId(mockTldNamehash, 1)
                ).to.be.revertedWith('Not authorized');
            });
            it('Should revert if caller is not the owner of the node', async () => {
                const { user1, user2, mockDcnRegistry, vehicleIdResolverInstance } = await loadFixture(setup);
                await mockDcnRegistry.mint(user2.address, [C.MOCK_TLD], ethers.constants.AddressZero, C.ONE_YEAR);

                await expect(
                    vehicleIdResolverInstance
                        .connect(user1)
                        .setVehicleId(mockTldNamehash, 1)
                ).to.be.revertedWith('Not authorized');
            });
            it('Should revert if DCN node and Vehicle Id owners does not match', async () => {
                const { user2, mockDcnManager, mockDcnRegistry, vehicleIdResolverInstance, mockVehicleId } = await loadFixture(setup);
                await mockVehicleId.connect(user2).mint(2);
                await mockDcnRegistry.mint(user2.address, [C.MOCK_TLD], ethers.constants.AddressZero, C.ONE_YEAR);

                await expect(
                    vehicleIdResolverInstance
                        .connect(mockDcnManager)
                        .setVehicleId(mockTldNamehash, 1)
                ).to.be.revertedWith('Owners does not match');
            });
        });

        context('State', () => {
            it('Should correctly set the vehicle Id', async () => {
                const { user1, mockDcnManager, mockDcnRegistry, vehicleIdResolverInstance, mockVehicleId } = await loadFixture(setup);
                await mockVehicleId.connect(user1).mint(2);
                await mockDcnRegistry.mint(user1.address, [C.MOCK_TLD], ethers.constants.AddressZero, C.ONE_YEAR);

                await vehicleIdResolverInstance
                    .connect(mockDcnManager)
                    .setVehicleId(mockTldNamehash, 2);

                expect(await vehicleIdResolverInstance.vehicleId(mockTldNamehash)).to.equal(2);
            });
            it('Should correctly set the node', async () => {
                const { user1, mockDcnManager, mockDcnRegistry, vehicleIdResolverInstance, mockVehicleId } = await loadFixture(setup);
                await mockVehicleId.connect(user1).mint(2);
                await mockDcnRegistry.mint(user1.address, [C.MOCK_TLD], ethers.constants.AddressZero, C.ONE_YEAR);

                await vehicleIdResolverInstance
                    .connect(mockDcnManager)
                    .setVehicleId(mockTldNamehash, 2);

                expect(await vehicleIdResolverInstance.nodeByVehicleId(2)).to.equal(mockTldNamehash);
            });
        });

        context('Events', () => {
            it('Should emit VehicleIdChanged event with correct params', async () => {
                const { user1, mockDcnManager, mockDcnRegistry, vehicleIdResolverInstance, mockVehicleId } = await loadFixture(setup);
                await mockVehicleId.connect(user1).mint(2);
                await mockDcnRegistry.mint(user1.address, [C.MOCK_TLD], ethers.constants.AddressZero, C.ONE_YEAR);

                await expect(
                    vehicleIdResolverInstance
                        .connect(mockDcnManager)
                        .setVehicleId(mockTldNamehash, 2)
                )
                    .to.emit(vehicleIdResolverInstance, 'VehicleIdChanged')
                    .withArgs(mockTldNamehash, 2);
            });
        });
    });

    describe('resetVehicle', () => {
        const mockTldNamehash = namehash(C.MOCK_TLD);

        context('Error handling', () => {
            it('Should revert if caller is not the DCN Manager', async () => {
                const { user1, nonDcnManager, mockDcnRegistry, vehicleIdResolverInstance } = await loadFixture(setup);
                await mockDcnRegistry.mint(user1.address, [C.MOCK_TLD], ethers.constants.AddressZero, C.ONE_YEAR);

                await expect(
                    vehicleIdResolverInstance
                        .connect(nonDcnManager)
                        .resetVehicleId(mockTldNamehash, 1)
                ).to.be.revertedWith('Not authorized');
            });
            it('Should revert if caller is not the owner of the node', async () => {
                const { user1, user2, mockDcnRegistry, vehicleIdResolverInstance } = await loadFixture(setup);
                await mockDcnRegistry.mint(user2.address, [C.MOCK_TLD], ethers.constants.AddressZero, C.ONE_YEAR);

                await expect(
                    vehicleIdResolverInstance
                        .connect(user1)
                        .resetVehicleId(mockTldNamehash, 1)
                ).to.be.revertedWith('Not authorized');
            });
            it('Should revert if DCN node and Vehicle Id owners does not match', async () => {
                const { user1, user2, mockDcnRegistry, mockVehicleId, vehicleIdResolverInstance } = await loadFixture(setup);
                await mockVehicleId.connect(user2).mint(2);
                await mockDcnRegistry.mint(user1.address, [C.MOCK_TLD], ethers.constants.AddressZero, C.ONE_YEAR);

                await expect(
                    vehicleIdResolverInstance
                        .connect(user1)
                        .resetVehicleId(mockTldNamehash, 2)
                ).to.be.revertedWith('Owners does not match');
            });
        });

        context('State', () => {
            it('Should correctly reset vehicle ID', async () => {
                const { user1, mockDcnRegistry, vehicleIdResolverInstance } = await loadFixture(setup);
                await mockDcnRegistry.mint(user1.address, [C.MOCK_TLD], ethers.constants.AddressZero, C.ONE_YEAR);
                await vehicleIdResolverInstance.connect(user1).setVehicleId(mockTldNamehash, 1);

                expect(await vehicleIdResolverInstance.vehicleId(mockTldNamehash)).to.be.equal(1);
                expect(await vehicleIdResolverInstance.nodeByVehicleId(1)).to.be.equal(mockTldNamehash);

                await vehicleIdResolverInstance
                    .connect(user1)
                    .resetVehicleId(mockTldNamehash, 1);

                expect(await vehicleIdResolverInstance.vehicleId(mockTldNamehash)).to.be.equal(0);
                expect(await vehicleIdResolverInstance.nodeByVehicleId(1)).to.be.equal(ethers.constants.HashZero);
            })
        });

        context('Events', () => {
            it('Should emit VehicleIdChanged event with correct params', async () => {
                const { user1, mockDcnRegistry, vehicleIdResolverInstance } = await loadFixture(setup);
                await mockDcnRegistry.mint(user1.address, [C.MOCK_TLD], ethers.constants.AddressZero, C.ONE_YEAR);
                await vehicleIdResolverInstance.connect(user1).setVehicleId(mockTldNamehash, 1);

                await expect(
                    vehicleIdResolverInstance
                        .connect(user1)
                        .resetVehicleId(mockTldNamehash, 1)
                )
                    .to.emit(vehicleIdResolverInstance, 'VehicleIdChanged')
                    .withArgs(mockTldNamehash, 0);
            });
        });
    });
});
