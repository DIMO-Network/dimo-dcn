import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';

import { C, initialize, namehash } from '../utils';
import { DCNRegistry, ResolverRegistry, VehicleIdResolver } from '../typechain-types';

describe('DCNRegistry', function () {
  async function setup() {
    const TTL_1_YEAR = (Date.parse(Date()) / 1000 + 60 * 60 * 24 * 365).toString();
    const TTL_2_YEAR = (Date.parse(Date()) / 1000 + 60 * 60 * 24 * 365 * 2).toString();

    const [deployer, admin, nonAdmin, user1] = await ethers.getSigners();

    let resolverInstance: ResolverRegistry;
    let vehicleIdResolverInstance: VehicleIdResolver;
    [resolverInstance, vehicleIdResolverInstance] = await initialize(deployer, 'VehicleIdResolver');

    const DCNRegistryFactory = await ethers.getContractFactory('DCNRegistry');
    const dcnRegistry = await upgrades.deployProxy(
      DCNRegistryFactory,
      [
        C.DCN_REGISTRY_NFT_NAME,
        C.DCN_REGISTRY_NFT_SYMBOL,
        C.DCN_REGISTRY_NFT_BASE_URI,
        resolverInstance.address
      ],
      {
        initializer: 'initialize',
        kind: 'uups'
      }
    ) as DCNRegistry;

    await dcnRegistry.connect(deployer).grantRole(C.ADMIN_ROLE, admin.address);
    await dcnRegistry.connect(deployer).grantRole(C.MINTER_ROLE, admin.address);

    return { deployer, admin, nonAdmin, user1, dcnRegistry, resolverInstance, vehicleIdResolverInstance, TTL_1_YEAR, TTL_2_YEAR };
  }

  describe('initialize', () => {
    context('State', () => {
      it('Should correctly set the name', async () => {
        const { dcnRegistry } = await loadFixture(setup);

        expect(await dcnRegistry.name()).to.equal(C.DCN_REGISTRY_NFT_NAME);
      });
      it('Should correctly set the symbol', async () => {
        const { dcnRegistry } = await loadFixture(setup);

        expect(await dcnRegistry.symbol()).to.equal(C.DCN_REGISTRY_NFT_SYMBOL);
      });
      it('Should correctly set the base URI', async () => {
        const { dcnRegistry } = await loadFixture(setup);

        expect(await dcnRegistry.baseURI()).to.equal(C.DCN_REGISTRY_NFT_BASE_URI);
      });
      it('Should correctly set the default resolver', async () => {
        const { dcnRegistry, resolverInstance } = await loadFixture(setup);

        expect(await dcnRegistry.defaultResolver()).to.equal(resolverInstance.address);
      });
      it('Should correctly grant DEFAULT_ADMIN_ROLE to deployer', async () => {
        const { deployer, dcnRegistry } = await loadFixture(setup);

        expect(await dcnRegistry.hasRole(C.DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
      });
      it('Should mint 0 token to deployer', async () => {
        const { deployer, dcnRegistry } = await loadFixture(setup);

        expect(await dcnRegistry.ownerOf(ethers.BigNumber.from(C.BYTES_32_ZER0))).to.equal(deployer.address);
      });
      it('Should register 0x00 node', async () => {
        const { dcnRegistry } = await loadFixture(setup);

        expect(await dcnRegistry.recordExists(C.BYTES_32_ZER0)).to.be.true;
        expect((await dcnRegistry.records(C.BYTES_32_ZER0)).resolver).to.equal(C.ZERO_ADDRESS);
        expect((await dcnRegistry.records(C.BYTES_32_ZER0)).ttl).to.equal(C.MAX_UINT_72);
      });
    });
  });

  describe('setBaseURI', () => {
    const newBaseURI = 'newBaseURI';

    context('Error handling', () => {
      it('Should revert if caller does not have the ADMIN_ROLE', async () => {
        const { nonAdmin, dcnRegistry } = await loadFixture(setup);

        await expect(
          dcnRegistry
            .connect(nonAdmin)
            .setBaseURI(newBaseURI)
        ).to.be.revertedWith(
          `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.ADMIN_ROLE
          }`
        );
      });
    });

    context('State', async () => {
      it('Should correctly set the base URI', async () => {
        const { admin, dcnRegistry } = await loadFixture(setup);

        await dcnRegistry.connect(admin).setBaseURI(newBaseURI);

        expect(await dcnRegistry.baseURI()).to.equal(newBaseURI);
      });
    });

    context('Events', () => {
      it('Should emit NewBaseURI event with correct params', async () => {
        const { admin, dcnRegistry } = await loadFixture(setup);

        await expect(
          dcnRegistry
            .connect(admin)
            .setBaseURI(newBaseURI)
        )
          .to.emit(dcnRegistry, 'NewBaseURI')
          .withArgs(newBaseURI);
      });
    });
  });

  describe('setDefaultResolver', () => {
    const newDefaultResolver = ethers.Wallet.createRandom().address;

    context('Error handling', () => {
      it('Should revert if caller does not have the ADMIN_ROLE', async () => {
        const { nonAdmin, dcnRegistry } = await loadFixture(setup);

        await expect(
          dcnRegistry
            .connect(nonAdmin)
            .setDefaultResolver(newDefaultResolver)
        ).to.be.revertedWith(
          `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.ADMIN_ROLE
          }`
        );
      });
      it('Should revert if new default resolver is the zero address', async () => {
        const { admin, dcnRegistry } = await loadFixture(setup);

        await expect(
          dcnRegistry
            .connect(admin)
            .setDefaultResolver(C.ZERO_ADDRESS)
        ).to.be.revertedWith('Zero address');
      });
    });

    context('State', () => {
      it('Should correctly set the new default resolver', async () => {
        const { admin, dcnRegistry } = await loadFixture(setup);

        await dcnRegistry.connect(admin).setDefaultResolver(newDefaultResolver);

        expect(await dcnRegistry.defaultResolver()).to.equal(newDefaultResolver);
      });
    });

    context('Events', () => {
      it('Should emit NewBaseURI event with correct params', async () => {
        const { admin, dcnRegistry } = await loadFixture(setup);

        await expect(
          dcnRegistry
            .connect(admin)
            .setDefaultResolver(newDefaultResolver)
        )
          .to.emit(dcnRegistry, 'NewDefaultResolver')
          .withArgs(newDefaultResolver);
      });
    });
  });

  describe('mint', () => {
    context('Error handling', () => {
      it('Should revert if caller does not have the MINTER_ROLE', async () => {
        const { nonAdmin, user1, dcnRegistry, TTL_1_YEAR } = await loadFixture(setup);

        await expect(
          dcnRegistry
            .connect(nonAdmin)
            .mint(user1.address, C.MOCK_LABELS, C.ZERO_ADDRESS, TTL_1_YEAR)
        ).to.be.revertedWith(
          `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.MINTER_ROLE
          }`
        );
      });
      it('Should revert if parent node does not exist', async () => {
        const { admin, user1, dcnRegistry, TTL_1_YEAR } = await loadFixture(setup);

        await expect(
          dcnRegistry
            .connect(admin)
            .mint(user1.address, C.MOCK_LABELS, C.ZERO_ADDRESS, TTL_1_YEAR)
        ).to.be.revertedWith('Parent node does not exist');
      });
      it('Should revert if label is empty', async () => {
        const { admin, user1, dcnRegistry, TTL_1_YEAR } = await loadFixture(setup);

        await expect(
          dcnRegistry
            .connect(admin)
            .mint(user1.address, [''], C.ZERO_ADDRESS, TTL_1_YEAR)
        ).to.be.revertedWith('Empty label');
      });
    });

    context('State change', () => {
      const mockTldNamehash = namehash(C.MOCK_TLD);

      it('Should mint token to the specified owner', async () => {
        const tokenId = ethers.BigNumber.from(mockTldNamehash).toString();
        const { admin, dcnRegistry, TTL_1_YEAR } = await loadFixture(setup);

        await dcnRegistry
          .connect(admin)
          .mint(admin.address, [C.MOCK_TLD], C.ZERO_ADDRESS, TTL_1_YEAR);

        expect(await dcnRegistry.ownerOf(tokenId)).to.equal(admin.address);
      });
      it('Should register resolver the default resolver if no resolver is set', async () => {
        const { admin, dcnRegistry, resolverInstance, TTL_1_YEAR } = await loadFixture(setup);

        await dcnRegistry
          .connect(admin)
          .mint(admin.address, [C.MOCK_TLD], C.ZERO_ADDRESS, TTL_1_YEAR);

        expect(await dcnRegistry.resolver(mockTldNamehash)).to.equal(resolverInstance.address);
      });
      it('Should register resolver if resolver is set', async () => {
        const newResolver = ethers.Wallet.createRandom().address;
        const { admin, dcnRegistry, TTL_1_YEAR } = await loadFixture(setup);

        await dcnRegistry
          .connect(admin)
          .mint(admin.address, [C.MOCK_TLD], newResolver, TTL_1_YEAR);

        expect(await dcnRegistry.resolver(mockTldNamehash)).to.equal(newResolver);
      });
      it('Should register ttl', async () => {
        const { admin, dcnRegistry, TTL_1_YEAR } = await loadFixture(setup);

        await dcnRegistry
          .connect(admin)
          .mint(admin.address, [C.MOCK_TLD], C.ZERO_ADDRESS, TTL_1_YEAR);

        expect(await dcnRegistry.ttl(mockTldNamehash)).to.equal(TTL_1_YEAR);
      });
    });

    context('Events', () => {
      it('Should emit NewResolver event with correct params', async () => {
        const mockTldNamehash = namehash(C.MOCK_TLD);
        const { admin, dcnRegistry, resolverInstance, TTL_1_YEAR } = await loadFixture(setup);

        await expect(
          dcnRegistry
            .connect(admin)
            .mint(admin.address, [C.MOCK_TLD], resolverInstance.address, TTL_1_YEAR)
        )
          .to.emit(dcnRegistry, 'NewResolver')
          .withArgs(mockTldNamehash, resolverInstance.address);
      });
      it('Should emit NewTTL event with correct params', async () => {
        const mockTldNamehash = namehash(C.MOCK_TLD);
        const { admin, dcnRegistry, TTL_1_YEAR } = await loadFixture(setup);

        await expect(
          dcnRegistry
            .connect(admin)
            .mint(admin.address, [C.MOCK_TLD], C.ZERO_ADDRESS, TTL_1_YEAR)
        )
          .to.emit(dcnRegistry, 'NewTTL')
          .withArgs(mockTldNamehash, TTL_1_YEAR);
      });
    });
  });

  describe('setRecord', () => {
    context('Error handling', () => {
      it('Should revert if caller does not have the ADMIN_ROLE', async () => {
        const mockTldNamehash = namehash(C.MOCK_TLD);
        const { nonAdmin, dcnRegistry, TTL_1_YEAR } = await loadFixture(setup);

        await expect(
          dcnRegistry
            .connect(nonAdmin)
            .setRecord(mockTldNamehash, C.ZERO_ADDRESS, TTL_1_YEAR)
        ).to.be.revertedWith(
          `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.ADMIN_ROLE
          }`
        );
      });
      it('Should revert if record does not exist', async () => {
        const mockTldNamehash = namehash(C.MOCK_TLD);
        const { admin, dcnRegistry, TTL_1_YEAR } = await loadFixture(setup);

        await expect(
          dcnRegistry
            .connect(admin)
            .setRecord(mockTldNamehash, C.ZERO_ADDRESS, TTL_1_YEAR)
        ).to.be.revertedWith('Node does not exist');
      });
    });

    context('State change', () => {
      const mockTldNamehash = namehash(C.MOCK_TLD);

      it('Should register resolver the default resolver if no resolver is set', async () => {
        const newResolver = ethers.Wallet.createRandom().address;
        const { admin, dcnRegistry, resolverInstance, TTL_1_YEAR } = await loadFixture(setup);

        await dcnRegistry
          .connect(admin)
          .mint(admin.address, [C.MOCK_TLD], newResolver, TTL_1_YEAR);

        expect(await dcnRegistry.resolver(mockTldNamehash)).to.equal(newResolver);

        await dcnRegistry
          .connect(admin)
          .setRecord(mockTldNamehash, C.ZERO_ADDRESS, TTL_1_YEAR)

        expect(await dcnRegistry.resolver(mockTldNamehash)).to.equal(resolverInstance.address);
      });
      it('Should register resolver if resolver is set', async () => {
        const newResolver = ethers.Wallet.createRandom().address;
        const { admin, dcnRegistry, resolverInstance, TTL_1_YEAR } = await loadFixture(setup);

        await dcnRegistry
          .connect(admin)
          .mint(admin.address, [C.MOCK_TLD], C.ZERO_ADDRESS, TTL_1_YEAR);

        expect(await dcnRegistry.resolver(mockTldNamehash)).to.equal(resolverInstance.address);

        await dcnRegistry
          .connect(admin)
          .setRecord(mockTldNamehash, newResolver, TTL_1_YEAR)

        expect(await dcnRegistry.resolver(mockTldNamehash)).to.equal(newResolver);
      });
      it('Should register ttl', async () => {
        const { admin, dcnRegistry, TTL_1_YEAR, TTL_2_YEAR } = await loadFixture(setup);

        await dcnRegistry
          .connect(admin)
          .mint(admin.address, [C.MOCK_TLD], C.ZERO_ADDRESS, TTL_1_YEAR);

        expect(await dcnRegistry.ttl(mockTldNamehash)).to.equal(TTL_1_YEAR);

        await dcnRegistry
          .connect(admin)
          .setRecord(mockTldNamehash, C.ZERO_ADDRESS, TTL_2_YEAR)

        expect(await dcnRegistry.ttl(mockTldNamehash)).to.equal(TTL_2_YEAR);
      });
    });

    context('Events', () => {
      const mockTldNamehash = namehash(C.MOCK_TLD);

      it('Should emit NewResolver event with correct params', async () => {
        const newResolver = ethers.Wallet.createRandom().address;
        const { admin, dcnRegistry, TTL_1_YEAR } = await loadFixture(setup);

        await dcnRegistry
          .connect(admin)
          .mint(admin.address, [C.MOCK_TLD], C.ZERO_ADDRESS, TTL_1_YEAR);

        await expect(
          dcnRegistry
            .connect(admin)
            .setRecord(mockTldNamehash, newResolver, TTL_1_YEAR)
        )
          .to.emit(dcnRegistry, 'NewResolver')
          .withArgs(mockTldNamehash, newResolver);
      });
      it('Should emit NewTTL event with correct params', async () => {
        const { admin, dcnRegistry, TTL_1_YEAR, TTL_2_YEAR } = await loadFixture(setup);

        await dcnRegistry
          .connect(admin)
          .mint(admin.address, [C.MOCK_TLD], C.ZERO_ADDRESS, TTL_1_YEAR);

        await expect(
          dcnRegistry
            .connect(admin)
            .setRecord(mockTldNamehash, C.ZERO_ADDRESS, TTL_2_YEAR)
        )
          .to.emit(dcnRegistry, 'NewTTL')
          .withArgs(mockTldNamehash, TTL_2_YEAR);
      });
    });
  });

  describe('setResolver', () => {
    const mockTldNamehash = namehash(C.MOCK_TLD);

    context('Error handling', () => {
      it('Should revert if caller does not have the ADMIN_ROLE', async () => {
        const { nonAdmin, dcnRegistry } = await loadFixture(setup);

        await expect(
          dcnRegistry
            .connect(nonAdmin)
            .setResolver(mockTldNamehash, C.ZERO_ADDRESS)
        ).to.be.revertedWith(
          `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.ADMIN_ROLE
          }`
        );
      });
      it('Should revert if record does not exist', async () => {
        const { admin, dcnRegistry } = await loadFixture(setup);

        await expect(
          dcnRegistry
            .connect(admin)
            .setResolver(mockTldNamehash, C.ZERO_ADDRESS)
        ).to.be.revertedWith('Node does not exist');
      });
    });

    context('State change', () => {
      const newResolver = ethers.Wallet.createRandom().address;

      it('Should register resolver the default resolver if no resolver is set', async () => {
        const { admin, dcnRegistry, resolverInstance, TTL_1_YEAR } = await loadFixture(setup);

        await dcnRegistry
          .connect(admin)
          .mint(admin.address, [C.MOCK_TLD], newResolver, TTL_1_YEAR);

        expect(await dcnRegistry.resolver(mockTldNamehash)).to.equal(newResolver);

        await dcnRegistry
          .connect(admin)
          .setResolver(mockTldNamehash, C.ZERO_ADDRESS)

        expect(await dcnRegistry.resolver(mockTldNamehash)).to.equal(resolverInstance.address);
      });
      it('Should register resolver if resolver is set', async () => {
        const { admin, dcnRegistry, resolverInstance, TTL_1_YEAR } = await loadFixture(setup);

        await dcnRegistry
          .connect(admin)
          .mint(admin.address, [C.MOCK_TLD], C.ZERO_ADDRESS, TTL_1_YEAR);

        expect(await dcnRegistry.resolver(mockTldNamehash)).to.equal(resolverInstance.address);

        await dcnRegistry
          .connect(admin)
          .setResolver(mockTldNamehash, newResolver)

        expect(await dcnRegistry.resolver(mockTldNamehash)).to.equal(newResolver);
      });
    });

    context('Events', () => {
      it('Should emit NewResolver event with correct params', async () => {
        const newResolver = ethers.Wallet.createRandom().address;
        const { admin, dcnRegistry, TTL_1_YEAR } = await loadFixture(setup);

        await dcnRegistry
          .connect(admin)
          .mint(admin.address, [C.MOCK_TLD], C.ZERO_ADDRESS, TTL_1_YEAR);

        await expect(
          dcnRegistry
            .connect(admin)
            .setResolver(mockTldNamehash, newResolver)
        )
          .to.emit(dcnRegistry, 'NewResolver')
          .withArgs(mockTldNamehash, newResolver);
      });
    });
  });

  describe('setTTL', () => {
    const mockTldNamehash = namehash(C.MOCK_TLD);

    context('Error handling', () => {
      it('Should revert if caller does not have the ADMIN_ROLE', async () => {
        const { nonAdmin, dcnRegistry, TTL_2_YEAR } = await loadFixture(setup);

        await expect(
          dcnRegistry
            .connect(nonAdmin)
            .setTTL(mockTldNamehash, TTL_2_YEAR)
        ).to.be.revertedWith(
          `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.ADMIN_ROLE
          }`
        );
      });
      it('Should revert if record does not exist', async () => {
        const { admin, dcnRegistry, TTL_2_YEAR } = await loadFixture(setup);

        await expect(
          dcnRegistry
            .connect(admin)
            .setTTL(mockTldNamehash, TTL_2_YEAR)
        ).to.be.revertedWith('Node does not exist');
      });
    });

    context('State change', () => {
      it('Should register ttl', async () => {
        const { admin, dcnRegistry, TTL_1_YEAR, TTL_2_YEAR } = await loadFixture(setup);

        await dcnRegistry
          .connect(admin)
          .mint(admin.address, [C.MOCK_TLD], C.ZERO_ADDRESS, TTL_1_YEAR);

        expect(await dcnRegistry.ttl(mockTldNamehash)).to.equal(TTL_1_YEAR);

        await dcnRegistry
          .connect(admin)
          .setTTL(mockTldNamehash, TTL_2_YEAR)

        expect(await dcnRegistry.ttl(mockTldNamehash)).to.equal(TTL_2_YEAR);
      });
    });

    context('Events', () => {
      it('Should emit NewTTL event with correct params', async () => {
        const { admin, dcnRegistry, TTL_1_YEAR, TTL_2_YEAR } = await loadFixture(setup);

        await dcnRegistry
          .connect(admin)
          .mint(admin.address, [C.MOCK_TLD], C.ZERO_ADDRESS, TTL_1_YEAR);

        await expect(
          dcnRegistry
            .connect(admin)
            .setTTL(mockTldNamehash, TTL_2_YEAR)
        )
          .to.emit(dcnRegistry, 'NewTTL')
          .withArgs(mockTldNamehash, TTL_2_YEAR);
      });
    });
  });

  describe('Transferring', () => {
    it('Should revert if caller does not have the TRANSFERER_ROLE', async () => {
      const mockTldNamehash = namehash(C.MOCK_TLD);
      const tokenId = ethers.BigNumber.from(mockTldNamehash).toString();
      const { admin, user1, dcnRegistry, TTL_1_YEAR } = await loadFixture(setup);

      await dcnRegistry
        .connect(admin)
        .mint(admin.address, [C.MOCK_TLD], C.ZERO_ADDRESS, TTL_1_YEAR);

      await expect(
        dcnRegistry
          .connect(admin)
          .transferFrom(admin.address, user1.address, tokenId)
      ).to.be.revertedWith(
        `AccessControl: account ${admin.address.toLowerCase()} is missing role ${C.TRANSFERER_ROLE
        }`
      );
    });
  });
});
