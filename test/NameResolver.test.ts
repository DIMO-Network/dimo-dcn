import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { C, initialize, namehash, mocks } from '../utils';
import { ResolverRegistry, NameResolver, Shared } from '../typechain-types';

describe('NameResolver', () => {
    async function setup() {
        const [deployer, admin, nonAdmin, user1, user2, foundation, mockDcnManager, nonDcnManager] = await ethers.getSigners();

        const { mockDimoToken, mockVehicleId, mockDcnRegistry } = await loadFixture(mocks);

        let resolverInstance: ResolverRegistry;
        let nameResolverInstance: NameResolver;
        let sharedInstance: Shared;
        [resolverInstance, nameResolverInstance, sharedInstance] = await initialize(deployer, 'NameResolver', 'Shared');

        await resolverInstance.grantRole(C.ADMIN_ROLE, admin.address);

        await sharedInstance.connect(admin).setFoundationAddress(foundation.address);
        await sharedInstance.connect(admin).setDimoToken(mockDimoToken.address);
        await sharedInstance.connect(admin).setDcnManager(mockDcnManager.address);
        await sharedInstance.connect(admin).setDcnRegistry(mockDcnRegistry.address);

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
            nameResolverInstance,
            mockVehicleId,
            mockDcnRegistry
        };
    }

    describe('setName', () => {
        const mockTldNamehash = namehash(C.MOCK_TLD);

        context('Error handling', () => {
            it('Should revert if caller is not the DCN Manager', async () => {
                const { nonDcnManager, nameResolverInstance } = await loadFixture(setup);

                await expect(
                    nameResolverInstance
                        .connect(nonDcnManager)
                        .setName(mockTldNamehash, C.MOCK_TLD)
                ).to.be.revertedWith('Only DCN Manager');
            });
        });

        context('State', () => {
            it('Should correctly set the name', async () => {
                const { mockDcnManager, nameResolverInstance } = await loadFixture(setup);

                await nameResolverInstance
                    .connect(mockDcnManager)
                    .setName(mockTldNamehash, C.MOCK_TLD);

                expect(await nameResolverInstance.name(mockTldNamehash)).to.equal(C.MOCK_TLD);
            });
        });

        context('Events', () => {
            it('Should emit NameChanged event with correct params', async () => {
                const { mockDcnManager, nameResolverInstance } = await loadFixture(setup);

                await expect(
                    nameResolverInstance
                        .connect(mockDcnManager)
                        .setName(mockTldNamehash, C.MOCK_TLD)
                )
                    .to.emit(nameResolverInstance, 'NameChanged')
                    .withArgs(mockTldNamehash, C.MOCK_TLD);
            });
        });
    });
});
