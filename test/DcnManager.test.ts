import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { C, namehash, setupBasic, setupTldMinted } from '../utils';

describe('DcnManager', function () {
  describe('initialize', () => {
    context('State', () => {
      it('Should correctly set the DCN Registry address', async () => {
        const { dcnManager, dcnRegistry } = await loadFixture(setupBasic);

        expect(await dcnManager.dcnRegistry()).to.equal(dcnRegistry.address);
      });
      it('Should correctly grant DEFAULT_ADMIN_ROLE to deployer', async () => {
        const { deployer, dcnManager } = await loadFixture(setupBasic);

        expect(await dcnManager.hasRole(C.DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
      });
    });
  });

  describe('mintTld', () => {
    context('Error handling', () => {
      it('Should revert if caller does not have the TLD_MINTER_ROLE', async () => {
        const { nonAdmin, user1, dcnManager } = await loadFixture(setupBasic);

        await expect(
          dcnManager
            .connect(nonAdmin)
            .mintTld(user1.address, C.MOCK_TLD, C.ONE_YEAR)
        ).to.be.revertedWith(
          `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.TLD_MINTER_ROLE
          }`
        );
      });
    });
  });

  describe('mint', () => {
    context('Error handling', () => {
      it('Should revert if labels length is not 2', async () => {
        const { user1, dcnManager } = await loadFixture(setupTldMinted);

        await expect(
          dcnManager
            .connect(user1)
            .mint(user1.address, C.MOCK_LABELS_3, C.ONE_YEAR, 0)
        ).to.be.revertedWith('Only 2 labels');
      });
      it('Should revert if label name length is less than 3', async () => {
        const { user1, dcnManager } = await loadFixture(setupTldMinted);

        await expect(
          dcnManager
            .connect(user1)
            .mint(user1.address, C.MOCK_LABELS_SHORT, C.ONE_YEAR, 0)
        ).to.be.revertedWithCustomError(dcnManager, 'InvalidLength');
      });
      it('Should revert if label name length is greater than 15', async () => {
        const { user1, dcnManager } = await loadFixture(setupTldMinted);

        await expect(
          dcnManager
            .connect(user1)
            .mint(user1.address, C.MOCK_LABELS_LONG, C.ONE_YEAR, 0)
            ).to.be.revertedWithCustomError(dcnManager, 'InvalidLength');
      });
      it('Should revert if label has characters other than [A-Z|a-z|0-9]', async () => {
        const { user1, dcnManager } = await loadFixture(setupTldMinted);

        await expect(
          dcnManager
            .connect(user1)
            .mint(user1.address, C.MOCK_LABELS_WRONG_CHARS, C.ONE_YEAR, 0)
            ).to.be.revertedWithCustomError(dcnManager, 'InvalidCharacter');
      });
    });

    context('State', () => {
      it('Should convert uppercase to lowercase', async () => {
        const { user1, dcnManager, dcnRegistry } = await loadFixture(setupTldMinted);

        await dcnManager
          .connect(user1)
          .mint(user1.address, C.MOCK_LABELS_UPPERCASE, C.ONE_YEAR, 0);

        const latestBlock = await time.latestBlock();
        const newNode = (await dcnRegistry.queryFilter(dcnRegistry.filters.NewNode(), latestBlock))[0].args.node;

        expect(newNode).to.be.equal(namehash(C.MOCK_LABELS));
      });
    });
  });

  describe('setResolver', () => {
    const mockTldNamehash = namehash(C.MOCK_TLD);

    context('Error handling', () => {
      it('Should revert if caller does not have the ADMIN_ROLE', async () => {
        const { nonAdmin, dcnManager } = await loadFixture(setupTldMinted);

        await expect(
          dcnManager
            .connect(nonAdmin)
            .setResolver(mockTldNamehash, C.ZERO_ADDRESS)
        ).to.be.revertedWith(
          `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.ADMIN_ROLE
          }`
        );
      });
    });
  });

  describe('setExpiration', () => {
    const mockTldNamehash = namehash(C.MOCK_TLD);

    context('Error handling', () => {
      it('Should revert if caller does not have the ADMIN_ROLE', async () => {
        const { nonAdmin, dcnManager } = await loadFixture(setupTldMinted);

        await expect(
          dcnManager
            .connect(nonAdmin)
            .setExpiration(mockTldNamehash, C.TWO_YEARS)
        ).to.be.revertedWith(
          `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.ADMIN_ROLE
          }`
        );
      });
    });
  });
});
