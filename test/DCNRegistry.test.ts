import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';

import { C, initialize } from '../utils';
import { DCNRegistry } from '../typechain-types';

describe('DCNRegistry', function () {
  async function deployOneYearLockFixture() {
    const TTL_1_YEAR = (Date.parse(Date()) / 1000 + 60 * 60 * 24 * 365).toString();

    const [deployer, admin, nonAdmin, user1] = await ethers.getSigners();

    const [resolverInstance] = await initialize(deployer);

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

    return { deployer, admin, nonAdmin, user1, dcnRegistry, resolverInstance, TTL_1_YEAR };
  }

  describe('initialize', () => {
    context('State', () => {
      it('Should correctly set the name', async () => {
        const { dcnRegistry } = await loadFixture(deployOneYearLockFixture);

        expect(await dcnRegistry.name()).to.equal(C.DCN_REGISTRY_NFT_NAME);
      });
      it('Should correctly set the symbol', async () => {
        const { dcnRegistry } = await loadFixture(deployOneYearLockFixture);

        expect(await dcnRegistry.symbol()).to.equal(C.DCN_REGISTRY_NFT_SYMBOL);
      });
      it('Should correctly set the base URI', async () => {
        const { dcnRegistry } = await loadFixture(deployOneYearLockFixture);

        expect(await dcnRegistry.baseURI()).to.equal(C.DCN_REGISTRY_NFT_BASE_URI);
      });
      it('Should correctly set the default resolver', async () => {
        const { dcnRegistry, resolverInstance } = await loadFixture(deployOneYearLockFixture);

        expect(await dcnRegistry.defaultResolver()).to.equal(resolverInstance.address);
      });
      it('Should correctly grant DEFAULT_ADMIN_ROLE to deployer', async () => {
        const { deployer, dcnRegistry } = await loadFixture(deployOneYearLockFixture);

        expect(await dcnRegistry.hasRole(C.DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
      });
      it('Should mint 0 token to deployer', async () => {
        const { deployer, dcnRegistry } = await loadFixture(deployOneYearLockFixture);

        expect(await dcnRegistry.ownerOf(ethers.BigNumber.from(C.BYTES_32_ZER0))).to.equal(deployer.address);
      });
      it('Should register 0x00 node', async () => {
        const { dcnRegistry } = await loadFixture(deployOneYearLockFixture);

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
        const { nonAdmin, dcnRegistry } = await loadFixture(deployOneYearLockFixture);

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
        const { deployer, admin, dcnRegistry } = await loadFixture(deployOneYearLockFixture);
        await dcnRegistry.connect(deployer).grantRole(C.ADMIN_ROLE, admin.address);

        await dcnRegistry.connect(admin).setBaseURI(newBaseURI);

        expect(await dcnRegistry.baseURI()).to.equal(newBaseURI);
      });
    });

    context('Events', () => {
      it('Should emit NewBaseURI event with correct params', async () => {
        const { deployer, admin, dcnRegistry } = await loadFixture(deployOneYearLockFixture);
        await dcnRegistry.connect(deployer).grantRole(C.ADMIN_ROLE, admin.address);

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
        const { nonAdmin, dcnRegistry } = await loadFixture(deployOneYearLockFixture);

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
        const { deployer, admin, dcnRegistry } = await loadFixture(deployOneYearLockFixture);
        await dcnRegistry.connect(deployer).grantRole(C.ADMIN_ROLE, admin.address);

        await expect(
          dcnRegistry
            .connect(admin)
            .setDefaultResolver(C.ZERO_ADDRESS)
        ).to.be.revertedWith('Zero address');
      });
    });

    context('State', () => {
      it('Should correctly set the new default resolver', async () => {
        const { deployer, admin, dcnRegistry } = await loadFixture(deployOneYearLockFixture);
        await dcnRegistry.connect(deployer).grantRole(C.ADMIN_ROLE, admin.address);

        await dcnRegistry.connect(admin).setDefaultResolver(newDefaultResolver);

        expect(await dcnRegistry.defaultResolver()).to.equal(newDefaultResolver);
      });
    });

    context('Events', () => {
      it('Should emit NewBaseURI event with correct params', async () => {
        const { deployer, admin, dcnRegistry } = await loadFixture(deployOneYearLockFixture);
        await dcnRegistry.connect(deployer).grantRole(C.ADMIN_ROLE, admin.address);

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
        const { nonAdmin, user1, dcnRegistry, TTL_1_YEAR } = await loadFixture(deployOneYearLockFixture);

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
        const { deployer, admin, user1, dcnRegistry, TTL_1_YEAR } = await loadFixture(deployOneYearLockFixture);
        await dcnRegistry.connect(deployer).grantRole(C.MINTER_ROLE, admin.address);

        await expect(
          dcnRegistry
            .connect(admin)
            .mint(user1.address, C.MOCK_LABELS, C.ZERO_ADDRESS, TTL_1_YEAR)
        ).to.be.revertedWith('Parent node does not exist');
      });
    });

    context('State change', () => {
      it('Should mint token to the specified owner', async () => {});
      it('Should register resolver as zero address if no resolver is set', async () => { });
      it('Should register resolver if resolver is set', async () => { });
      it('Should register ttl', async () => { });
    });

    context('Events', () => {
      it('Should emit NewResolver event with correct params', async () => { });
      it('Should emit NewTTL event with correct params', async () => { });
    });
  });

  describe('setRecord', () => {
    context('Error handling', () => {
      it('Should revert if caller does not have the ADMIN_ROLE', async () => {});
      it('Should revert if record does not exist', async () => { });
    });

    context('State change', () => {
      it('Should register resolver as zero address if no resolver is set', async () => { });
      it('Should register resolver if resolver is set', async () => { });
      it('Should register ttl', async () => { });
    });

    context('Events', () => {
      it('Should emit NewResolver event with correct params', async () => { });
      it('Should emit NewTTL event with correct params', async () => { });
    });
  });

  describe('setResolver', () => {
    context('Error handling', () => {
      it('Should revert if caller does not have the ADMIN_ROLE', async () => { });
      it('Should revert if record does not exist', async () => { });
    });

    context('State change', () => {
      it('Should register resolver as zero address if no resolver is set', async () => { });
      it('Should register resolver if resolver is set', async () => { });
    });

    context('Events', () => {
      it('Should emit NewResolver event with correct params', async () => { });
    });
  });

  describe('setTTL', () => {
    context('Error handling', () => {
      it('Should revert if caller does not have the ADMIN_ROLE', async () => { });
      it('Should revert if record does not exist', async () => { });
    });

    context('State change', () => {
      it('Should register ttl', async () => { });
    });

    context('Events', () => {
      it('Should emit NewTTL event with correct params', async () => { });
    });
  });

  // describe('Withdrawals', function () {
  //   describe('Validations', function () {
  //     it('Should revert with the right error if called too soon', async function () {
  //       const { lock } = await loadFixture(deployOneYearLockFixture);

  //       await expect(lock.withdraw()).to.be.revertedWith(
  //         'You can't withdraw yet'
  //       );
  //     });

  //     it('Should revert with the right error if called from another account', async function () {
  //       const { lock, unlockTime, otherAccount } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       // We can increase the time in Hardhat Network
  //       await time.increaseTo(unlockTime);

  //       // We use lock.connect() to send a transaction from another account
  //       await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
  //         'You aren't the owner'
  //       );
  //     });

  //     it('Shouldn't fail if the unlockTime has arrived and the owner calls it', async function () {
  //       const { lock, unlockTime } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       // Transactions are sent using the first signer by default
  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw()).not.to.be.reverted;
  //     });
  //   });

  //   describe('Events', function () {
  //     it('Should emit an event on withdrawals', async function () {
  //       const { lock, unlockTime, lockedAmount } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw())
  //         .to.emit(lock, 'Withdrawal')
  //         .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
  //     });
  //   });

  //   describe('Transfers', function () {
  //     it('Should transfer the funds to the owner', async function () {
  //       const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw()).to.changeEtherBalances(
  //         [owner, lock],
  //         [lockedAmount, -lockedAmount]
  //       );
  //     });
  //   });
  // });
});
