import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { C, namehash, setupBasic, setupTldMinted, setupVehicleMinted, setupBasicRegistryMock } from '../utils';

describe('DcnRegistry', () => {
  describe('initialize', () => {
    context('State', () => {
      it('Should correctly set the name', async () => {
        const { dcnRegistry } = await loadFixture(setupBasic);

        expect(await dcnRegistry.name()).to.equal(C.DCN_REGISTRY_NFT_NAME);
      });
      it('Should correctly set the symbol', async () => {
        const { dcnRegistry } = await loadFixture(setupBasic);

        expect(await dcnRegistry.symbol()).to.equal(C.DCN_REGISTRY_NFT_SYMBOL);
      });
      it('Should correctly set the base URI', async () => {
        const { dcnRegistry } = await loadFixture(setupBasic);

        expect(await dcnRegistry.baseURI()).to.equal(C.DCN_REGISTRY_NFT_BASE_URI);
      });
      it('Should correctly set the default resolver', async () => {
        const { dcnRegistry, resolverInstance } = await loadFixture(setupBasic);

        expect(await dcnRegistry.defaultResolver()).to.equal(resolverInstance.address);
      });
      it('Should correctly grant DEFAULT_ADMIN_ROLE to deployer', async () => {
        const { deployer, dcnRegistry } = await loadFixture(setupBasic);

        expect(await dcnRegistry.hasRole(C.DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
      });
      it('Should mint 0 token to deployer', async () => {
        const { deployer, dcnRegistry } = await loadFixture(setupBasic);

        expect(await dcnRegistry.ownerOf(ethers.BigNumber.from(ethers.constants.HashZero))).to.equal(deployer.address);
      });
      it('Should register 0x00 node', async () => {
        const timeStamp = await time.latest();
        const tldExpires = ethers.BigNumber.from(ethers.constants.MaxUint256).sub(timeStamp);
        const { dcnRegistry } = await loadFixture(setupBasic);

        expect(await dcnRegistry.recordExists(ethers.constants.HashZero)).to.be.true;
        expect((await dcnRegistry.records(ethers.constants.HashZero)).resolver).to.equal(ethers.constants.AddressZero);
        expect((await dcnRegistry.records(ethers.constants.HashZero)).expires).to.gte(tldExpires);
      });
    });
  });

  describe('setBaseURI', () => {
    const newBaseURI = 'newBaseURI';

    context('Error handling', () => {
      it('Should revert if caller does not have the ADMIN_ROLE', async () => {
        const { nonAdmin, dcnRegistry } = await loadFixture(setupBasic);

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
        const { admin, dcnRegistry } = await loadFixture(setupBasic);

        await dcnRegistry.connect(admin).setBaseURI(newBaseURI);

        expect(await dcnRegistry.baseURI()).to.equal(newBaseURI);
      });
    });

    context('Events', () => {
      it('Should emit NewBaseURI event with correct params', async () => {
        const { admin, dcnRegistry } = await loadFixture(setupBasic);

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
        const { nonAdmin, dcnRegistry } = await loadFixture(setupBasic);

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
        const { admin, dcnRegistry } = await loadFixture(setupBasic);

        await expect(
          dcnRegistry
            .connect(admin)
            .setDefaultResolver(ethers.constants.AddressZero)
        ).to.be.revertedWith('Zero address');
      });
    });

    context('State', () => {
      it('Should correctly set the new default resolver', async () => {
        const { admin, dcnRegistry } = await loadFixture(setupBasic);

        await dcnRegistry.connect(admin).setDefaultResolver(newDefaultResolver);

        expect(await dcnRegistry.defaultResolver()).to.equal(newDefaultResolver);
      });
    });

    context('Events', () => {
      it('Should emit NewBaseURI event with correct params', async () => {
        const { admin, dcnRegistry } = await loadFixture(setupBasic);

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

  describe('mintTld', () => {
    context('Error handling', () => {
      it('Should revert if caller does not have the MANAGER_ROLE', async () => {
        const { nonManager, user1, dcnRegistry } = await loadFixture(setupBasic);

        await expect(
          dcnRegistry
            .connect(nonManager)
            .mintTld(user1.address, C.MOCK_TLD, ethers.constants.AddressZero, C.ONE_YEAR)
        ).to.be.revertedWith(
          `AccessControl: account ${nonManager.address.toLowerCase()} is missing role ${C.MANAGER_ROLE
          }`
        );
      });
      it('Should revert if label is empty', async () => {
        const { admin, dcnMockManager, dcnRegistry } = await loadFixture(setupBasicRegistryMock);

        await expect(
          dcnRegistry
            .connect(dcnMockManager)
            .mintTld(admin.address, '', ethers.constants.AddressZero, C.ONE_YEAR)
        ).to.be.revertedWith('Empty label');
      });
    });

    context('State', () => {
      const mockTldNamehash = namehash(C.MOCK_TLD);

      it('Should mint token to the specified owner', async () => {
        const tokenId = ethers.BigNumber.from(mockTldNamehash).toString();
        const { admin, dcnManager, dcnRegistry } = await loadFixture(setupBasic);

        await dcnManager
          .connect(admin)
          .mintTld(admin.address, C.MOCK_TLD, C.ONE_YEAR);

        expect(await dcnRegistry.ownerOf(tokenId)).to.equal(admin.address);
      });
      it('Should register resolver the default resolver if no resolver is set', async () => {
        const { admin, dcnManager, dcnRegistry, resolverInstance } = await loadFixture(setupBasic);

        await dcnManager
          .connect(admin)
          .mintTld(admin.address, C.MOCK_TLD, C.ONE_YEAR);

        expect(await dcnRegistry.resolver(mockTldNamehash)).to.equal(resolverInstance.address);
      });
      it('Should register expiration', async () => {
        const timeStamp = await time.latest();
        const tldExpires = ethers.BigNumber.from(C.ONE_YEAR).add(timeStamp);
        const { admin, dcnManager, dcnRegistry } = await loadFixture(setupBasic);

        await dcnManager
          .connect(admin)
          .mintTld(admin.address, C.MOCK_TLD, C.ONE_YEAR);

        expect(await dcnRegistry.expires(mockTldNamehash)).to.gte(tldExpires);
      });
    });

    // context('Events', () => {
    //   it('Should emit NewExpiration event with correct params', async () => {
    //     const { admin, dcnManager, dcnRegistry } = await loadFixture(setupBasic);
    //     const mockTldNamehash = namehash(C.MOCK_TLD);
    //     const timeStamp = await time.latest();
    //     const tldExpires = ethers.BigNumber.from(C.ONE_YEAR).add(timeStamp);
    //     console.log(mockTldNamehash)


    //     const tx = await dcnManager
    //         .connect(admin)
    //         .mintTld(admin.address, C.MOCK_TLD, C.ONE_YEAR);
    //         const receipt = await tx.wait();
    //         // .to.emit(dcnRegistry, 'NewExpiration')
    //         // .withArgs(mockTldNamehash, tldExpires);
    //     // console.log(receipt.events)
    //     // console.log(receipt.events?.filter((x) => {return x.address == dcnRegistry.address}));
    //     // receipt.events?.filter((x) => {return x.address == dcnRegistry.address}).forEach(async x => console.log(await x.getTransactionReceipt()));
    //   });
    // });
  });

  describe('mint', () => {
    const mockNamehash = namehash(C.MOCK_LABELS);

    context('Error handling', () => {
      it('Should revert if caller does not have the MANAGER_ROLE', async () => {
        const { user1, nonManager, dcnRegistry } = await loadFixture(setupTldMinted);

        await expect(
          dcnRegistry
            .connect(nonManager)
            .mint(user1.address, C.MOCK_LABELS, ethers.constants.AddressZero, C.ONE_YEAR)
        ).to.be.revertedWith(
          `AccessControl: account ${nonManager.address.toLowerCase()} is missing role ${C.MANAGER_ROLE
          }`
        );
      });
      it('Should revert if parent node does not exist', async () => {
        const { user1, dcnManager, mockDimoToken } = await loadFixture(setupBasic);

        await mockDimoToken
          .connect(user1)
          .mint(C.ONE_MILLION);
        await mockDimoToken
          .connect(user1)
          .approve(dcnManager.address, C.ONE_MILLION);

        await expect(
          dcnManager
            .connect(user1)
            .mint(user1.address, C.MOCK_LABELS, C.ONE_YEAR, 0)
        ).to.be.revertedWith('Parent node does not exist');
      });
      it('Should revert if label is empty', async () => {
        const { user1, dcnMockManager, dcnRegistry } = await loadFixture(setupBasicRegistryMock);

        await dcnRegistry
          .connect(dcnMockManager)
          .mintTld(user1.address, C.MOCK_TLD, ethers.constants.AddressZero, C.ONE_YEAR);

        await expect(
          dcnRegistry
            .connect(dcnMockManager)
            .mint(user1.address, ['', C.MOCK_TLD], ethers.constants.AddressZero, C.ONE_YEAR)
        ).to.be.revertedWith('Empty label');
      });
      it('Should revert if labels is below 2', async () => {
        const { user1, dcnMockManager, dcnRegistry } = await loadFixture(setupBasicRegistryMock);

        await expect(
          dcnRegistry
            .connect(dcnMockManager)
            .mint(user1.address, [C.MOCK_TLD], ethers.constants.AddressZero, C.ONE_YEAR)
        ).to.be.revertedWith('Labels length below 2');
      });
    });

    context('State', () => {
      it('Should mint token to the specified owner', async () => {
        const tokenId = ethers.BigNumber.from(mockNamehash).toString();
        const { user1, dcnManager, dcnRegistry } = await loadFixture(setupTldMinted);

        await dcnManager
          .connect(user1)
          .mint(user1.address, C.MOCK_LABELS, C.ONE_YEAR, 0);

        expect(await dcnRegistry.ownerOf(tokenId)).to.equal(user1.address);
      });
      it('Should register resolver the default resolver if no resolver is set', async () => {
        const { user1, dcnManager, dcnRegistry, resolverInstance } = await loadFixture(setupTldMinted);

        await dcnManager
          .connect(user1)
          .mint(user1.address, C.MOCK_LABELS, C.ONE_YEAR, 0);

        expect(await dcnRegistry.resolver(mockNamehash)).to.equal(resolverInstance.address);
      });
      it('Should register expiration', async () => {
        const timeStamp = await time.latest();
        const tldExpires = ethers.BigNumber.from(C.ONE_YEAR).add(timeStamp);
        const { user1, dcnManager, dcnRegistry } = await loadFixture(setupTldMinted);

        await dcnManager
          .connect(user1)
          .mint(user1.address, C.MOCK_LABELS, C.ONE_YEAR, 0);

        expect(await dcnRegistry.expires(mockNamehash)).to.equal(tldExpires);
      });
    });

    context('Events', () => {
      it('Should emit NewExpiration event with correct params', async () => {
        const timeStamp = await time.latest();
        const tldExpires = ethers.BigNumber.from(C.ONE_YEAR).add(timeStamp);
        const { user1, dcnManager, dcnRegistry } = await loadFixture(setupTldMinted);

        await expect(
          dcnManager
            .connect(user1)
            .mint(user1.address, C.MOCK_LABELS, C.ONE_YEAR, 0)
        )
          .to.emit(dcnRegistry, 'NewExpiration')
          .withArgs(mockNamehash, tldExpires);
      });
    });
  });

  describe('burnTld', () => {
    const mockTldNamehash = namehash(C.MOCK_TLD);

    context('Error handling', () => {
      it('Should revert if caller does not have the ADMIN_ROLE', async () => {
        const { nonAdmin, dcnRegistry } = await loadFixture(setupBasic);

        await expect(
          dcnRegistry
            .connect(nonAdmin)
            .burnTld(C.MOCK_TLD)
        ).to.be.revertedWith(
          `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.ADMIN_ROLE
          }`
        );
      });
      it('Should revert if TLD does not exist', async () => {
        const { admin, dcnRegistry } = await loadFixture(setupBasic);

        await expect(
          dcnRegistry
            .connect(admin)
            .burnTld(C.MOCK_INVALID_TLD)
        ).to.be.revertedWith('ERC721: invalid token ID');
      });
    });

    context('State', () => {
      it('Should successfully burn the token', async () => {
        const tokenId = ethers.BigNumber.from(mockTldNamehash).toString();
        const { admin, dcnRegistry } = await loadFixture(setupTldMinted);

        expect(await dcnRegistry.ownerOf(tokenId)).to.equal(admin.address);

        await dcnRegistry.connect(admin).burnTld(C.MOCK_TLD);

        await expect(
          dcnRegistry.ownerOf(tokenId)
        ).to.be.revertedWith('ERC721: invalid token ID');
      });
      it('Should reset resolver and expires of the node', async () => {
        const timeStamp = await time.latest();
        const tldExpires = ethers.BigNumber.from(C.ONE_YEAR).add(timeStamp);
        const { admin, dcnRegistry, resolverInstance } = await loadFixture(setupTldMinted);

        expect(await dcnRegistry.resolver(mockTldNamehash)).to.equal(resolverInstance.address);
        expect(await dcnRegistry.expires(mockTldNamehash)).to.be.approximately(tldExpires, 10);

        await dcnRegistry.connect(admin).burnTld(C.MOCK_TLD);

        expect(await dcnRegistry.resolver(mockTldNamehash)).to.equal(resolverInstance.address);
        expect(await dcnRegistry.expires(mockTldNamehash)).to.equal(0);
      });
    });
  });

  describe('claim', () => {
    const mockNamehash = namehash(C.MOCK_LABELS);

    context('Error handling', () => {
      it('Should revert if caller does not have the MANAGER_ROLE', async () => {
        const { user1, nonManager, dcnRegistry } = await loadFixture(setupVehicleMinted);

        await expect(
          dcnRegistry
            .connect(nonManager)
            .claim(user1.address, mockNamehash, ethers.constants.AddressZero, C.ONE_YEAR)
        ).to.be.revertedWith(
          `AccessControl: account ${nonManager.address.toLowerCase()} is missing role ${C.MANAGER_ROLE
          }`
        );
      });
      it('Should revert if node does not exist', async () => {
        const { user1, dcnManager } = await loadFixture(setupVehicleMinted);

        await expect(
          dcnManager
            .connect(user1)
            .claim(user1.address, mockNamehash, C.ONE_YEAR, 0)
        ).to.be.revertedWith('ERC721: invalid token ID');
      });
      it('Should revert if node does not exist', async () => {
        const { user1, dcnManager } = await loadFixture(setupVehicleMinted);

        await expect(
          dcnManager
            .connect(user1)
            .claim(user1.address, mockNamehash, C.ONE_YEAR, 0)
        ).to.be.revertedWith('ERC721: invalid token ID');
      });
      it('Should revert if node is not yet expired', async () => {
        const { user1, user2, dcnManager, mockDimoToken } = await loadFixture(setupVehicleMinted);

        await dcnManager
          .connect(user1)
          .mint(user1.address, C.MOCK_LABELS, C.ONE_YEAR, 0);

        await mockDimoToken
          .connect(user2)
          .mint(C.ONE_MILLION);
        await mockDimoToken
          .connect(user2)
          .approve(dcnManager.address, C.ONE_MILLION);

        await expect(
          dcnManager
            .connect(user2)
            .claim(user2.address, mockNamehash, C.ONE_YEAR, 0)
        ).to.be.revertedWith('Not available');
      });
    });

    context('State', () => {
      it('Should remint node to the new user', async () => {
        const { user1, user2, dcnManager, dcnRegistry, mockDimoToken, vehicleIdInstance } = await loadFixture(setupVehicleMinted);

        await dcnManager
          .connect(user1)
          .mint(user1.address, C.MOCK_LABELS, C.ONE_YEAR, 1);

        await time.increase(C.ONE_YEAR + 1);

        expect(await dcnRegistry.ownerOf(mockNamehash)).to.equal(user1.address);

        await mockDimoToken
          .connect(user2)
          .mint(C.ONE_MILLION);
        await mockDimoToken
          .connect(user2)
          .approve(dcnManager.address, C.ONE_MILLION);
        await vehicleIdInstance.connect(user2).mint(2);

        await dcnManager
          .connect(user2)
          .claim(user2.address, mockNamehash, C.ONE_YEAR, 2);

        expect(await dcnRegistry.ownerOf(mockNamehash)).to.equal(user2.address);
      });
      it('Should link node to the vehicle ID of the new owner', async () => {
        const { user1, user2, dcnManager, dcnRegistry, mockDimoToken, vehicleIdInstance, vehicleIdResolverInstance } = await loadFixture(setupVehicleMinted);

        await dcnManager
          .connect(user1)
          .mint(user1.address, C.MOCK_LABELS, C.ONE_YEAR, 1);

        await time.increase(C.ONE_YEAR + 1);

        expect(await dcnRegistry.ownerOf(mockNamehash)).to.equal(user1.address);

        await mockDimoToken
          .connect(user2)
          .mint(C.ONE_MILLION);
        await mockDimoToken
          .connect(user2)
          .approve(dcnManager.address, C.ONE_MILLION);
        await vehicleIdInstance.connect(user2).mint(2);

        await dcnManager
          .connect(user2)
          .claim(user2.address, mockNamehash, C.ONE_YEAR, 2);

        expect(await vehicleIdResolverInstance.vehicleId(mockNamehash)).to.be.equal(2);
        expect(await vehicleIdResolverInstance.nodeByVehicleId(2)).to.be.equal(mockNamehash);
      });
    });
  });

  describe('renew', () => {
    const mockNamehash = namehash(C.MOCK_LABELS);

    context('Error handling', () => {
      it('Should revert if caller does not have the MANAGER_ROLE', async () => {
        const { nonManager, dcnRegistry } = await loadFixture(setupBasic);

        await expect(
          dcnRegistry
            .connect(nonManager)
            .renew(mockNamehash, C.ONE_YEAR)
        ).to.be.revertedWith(
          `AccessControl: account ${nonManager.address.toLowerCase()} is missing role ${C.MANAGER_ROLE
          }`
        );
      });
    });
    context('State', () => {
      it('Should set expiration if token is not expired', async () => {
        const { user1, dcnManager, dcnRegistry } = await loadFixture(setupVehicleMinted);
        const currentTime = await time.latest();

        await dcnManager
          .connect(user1)
          .mint(user1.address, C.MOCK_LABELS, C.ONE_YEAR, 0);

        const oldExpiration = await dcnRegistry.expires(mockNamehash);
        expect(oldExpiration).to.be.approximately(currentTime + C.ONE_YEAR, 5);

        await time.increase(C.HALF_YEAR);

        await dcnManager
          .connect(user1)
          .renew(user1.address, mockNamehash, C.ONE_YEAR);

        expect(await dcnRegistry.expires(mockNamehash))
          .to.be.approximately(oldExpiration.add(C.ONE_YEAR), 5);
      });
      it('Should set expiration if token is expired, but not claimed by another user', async () => {
        const { user1, dcnManager, dcnRegistry } = await loadFixture(setupVehicleMinted);
        let currentTime = await time.latest();

        await dcnManager
          .connect(user1)
          .mint(user1.address, C.MOCK_LABELS, C.ONE_YEAR, 0);

        const oldExpiration = await dcnRegistry.expires(mockNamehash);
        expect(oldExpiration).to.be.approximately(currentTime + C.ONE_YEAR, 5);

        await time.increase(C.TWO_YEARS);
        currentTime = await time.latest();

        await dcnManager
          .connect(user1)
          .renew(user1.address, mockNamehash, C.ONE_YEAR);

        expect(await dcnRegistry.expires(mockNamehash))
          .to.be.approximately(currentTime + C.ONE_YEAR, 5);
      });
    });
  })

  describe('setResolver', () => {
    const mockTldNamehash = namehash(C.MOCK_TLD);

    context('Error handling', () => {
      it('Should revert if caller does not have the MANAGER_ROLE', async () => {
        const { nonManager, dcnRegistry } = await loadFixture(setupTldMinted);

        await expect(
          dcnRegistry
            .connect(nonManager)
            .setResolver(mockTldNamehash, ethers.constants.AddressZero)
        ).to.be.revertedWith(
          `AccessControl: account ${nonManager.address.toLowerCase()} is missing role ${C.MANAGER_ROLE
          }`
        );
      });
      it('Should revert if record does not exist', async () => {
        const { admin, dcnManager } = await loadFixture(setupBasic);

        await expect(
          dcnManager
            .connect(admin)
            .setResolver(mockTldNamehash, ethers.constants.AddressZero)
        ).to.be.revertedWith('Node does not exist');
      });
    });

    context('State', () => {
      it('Should register resolver the default resolver if no resolver is set', async () => {
        const { admin, dcnManager, dcnRegistry, resolverInstance } = await loadFixture(setupTldMinted);

        await dcnManager
          .connect(admin)
          .setResolver(mockTldNamehash, ethers.constants.AddressZero)

        expect(await dcnRegistry.resolver(mockTldNamehash)).to.equal(resolverInstance.address);
      });
    });

    context('Events', () => {
      it('Should emit NewResolver event with correct params', async () => {
        const newResolver = ethers.Wallet.createRandom().address;
        const { admin, dcnManager, dcnRegistry } = await loadFixture(setupTldMinted);

        await expect(
          dcnManager
            .connect(admin)
            .setResolver(mockTldNamehash, newResolver)
        )
          .to.emit(dcnRegistry, 'NewResolver')
          .withArgs(mockTldNamehash, newResolver);
      });
    });
  });

  describe('setExpiration', () => {
    const mockTldNamehash = namehash(C.MOCK_TLD);

    context('Error handling', () => {
      it('Should revert if caller does not have the MANAGER_ROLE', async () => {
        const { nonManager, dcnRegistry } = await loadFixture(setupTldMinted);

        await expect(
          dcnRegistry
            .connect(nonManager)
            .setExpiration(mockTldNamehash, C.TWO_YEARS)
        ).to.be.revertedWith(
          `AccessControl: account ${nonManager.address.toLowerCase()} is missing role ${C.MANAGER_ROLE
          }`
        );
      });
      it('Should revert if record does not exist', async () => {
        const { admin, dcnManager } = await loadFixture(setupBasic);

        await expect(
          dcnManager
            .connect(admin)
            .setExpiration(mockTldNamehash, C.TWO_YEARS)
        ).to.be.revertedWith('Node does not exist');
      });
    });

    context('State', () => {
      it('Should register expiration', async () => {
        const timeStamp = await time.latest();
        const tldExpires2 = ethers.BigNumber.from(C.TWO_YEARS).add(timeStamp);
        const { admin, dcnManager, dcnRegistry } = await loadFixture(setupTldMinted);

        await dcnManager
          .connect(admin)
          .setExpiration(mockTldNamehash, C.TWO_YEARS)

        expect(await dcnRegistry.expires(mockTldNamehash)).to.gte(tldExpires2);
      });
    });

    // context('Events', () => {
    //   it('Should emit NewExpiration event with correct params', async () => {
    //     const timeStamp = await time.latest();
    //     const tldExpires2 = ethers.BigNumber.from(C.TWO_YEARS).add(timeStamp);
    //     const { admin, dcnManager, dcnRegistry } = await loadFixture(setupTldMinted);

    //     await expect(
    //       dcnManager
    //         .connect(admin)
    //         .setExpiration(mockTldNamehash, C.TWO_YEARS)
    //     )
    //       .to.emit(dcnRegistry, 'NewExpiration')
    //       .withArgs(mockTldNamehash, tldExpires2);
    //   });
    // });
  });

  describe('record', () => {
    it('Should correctly return the record associated with minted node', async () => {
      const timeStamp = await time.latest();
      const tldExpires = ethers.BigNumber.from(C.ONE_YEAR).add(timeStamp);
      
      const mockNamehash = namehash(C.MOCK_LABELS);
      const { user1, dcnManager, dcnRegistry, resolverInstance } = await loadFixture(setupTldMinted);

      await dcnManager
        .connect(user1)
        .mint(user1.address, C.MOCK_LABELS, C.ONE_YEAR, 0);

      const record = await dcnRegistry.record(mockNamehash);

      expect(record.resolver_).to.equal(resolverInstance.address);
      expect(record.expires_).to.gte(tldExpires);
    });
  });

  describe('Transferring', () => {
    it('Should revert if caller does not have the TRANSFERER_ROLE', async () => {
      const mockTldNamehash = namehash(C.MOCK_TLD);
      const tokenId = ethers.BigNumber.from(mockTldNamehash).toString();
      const { admin, user1, dcnManager, dcnRegistry } = await loadFixture(setupBasic);

      await dcnManager
        .connect(admin)
        .mintTld(admin.address, C.MOCK_TLD, C.ONE_YEAR);

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
