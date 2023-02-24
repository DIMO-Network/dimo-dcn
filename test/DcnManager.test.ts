import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
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

  describe('mintTLD', () => {
    context('Error handling', () => {
      it('Should revert if caller does not have the TLD_MINTER_ROLE', async () => {
        const { nonAdmin, user1, dcnManager } = await loadFixture(setupBasic);

        await expect(
          dcnManager
            .connect(nonAdmin)
            .mintTLD(user1.address, C.MOCK_TLD, C.ONE_YEAR)
        ).to.be.revertedWith(
            `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.TLD_MINTER_ROLE
            }`
          );
      });
    });
  });

  describe('mint', () => {
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
