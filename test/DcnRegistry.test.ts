import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { C, namehash, setupBasic, setupTldMinted, setupVehicleMinted } from '../utils';

describe('DcnRegistry', function () {
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
      // TODO Set DCN Manager
      // TODO Set grace period
      it('Should correctly grant DEFAULT_ADMIN_ROLE to deployer', async () => {
        const { deployer, dcnRegistry } = await loadFixture(setupBasic);

        expect(await dcnRegistry.hasRole(C.DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
      });
      it('Should mint 0 token to deployer', async () => {
        const { deployer, dcnRegistry } = await loadFixture(setupBasic);

        expect(await dcnRegistry.ownerOf(ethers.BigNumber.from(C.BYTES_32_ZER0))).to.equal(deployer.address);
      });
      it('Should register 0x00 node', async () => {
        const timeStamp = await time.latest();
        const tldExpires = ethers.BigNumber.from(C.MAX_UINT_256).sub(timeStamp);
        const { dcnRegistry } = await loadFixture(setupBasic);

        expect(await dcnRegistry.recordExists(C.BYTES_32_ZER0)).to.be.true;
        expect((await dcnRegistry.records(C.BYTES_32_ZER0)).resolver).to.equal(C.ZERO_ADDRESS);
        expect((await dcnRegistry.records(C.BYTES_32_ZER0)).expires).to.gte(tldExpires);
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
            .setDefaultResolver(C.ZERO_ADDRESS)
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

  describe('mintTLD', () => {
    context('Error handling', () => {
      it('Should revert if caller is not the DCN Manager', async () => {
        const { nonAdmin, user1, dcnRegistry } = await loadFixture(setupBasic);

        await expect(
          dcnRegistry
            .connect(nonAdmin)
            .mintTLD(user1.address, C.MOCK_TLD, C.ZERO_ADDRESS, C.EXPIRATION_1_YEAR)
        ).to.be.revertedWith('Only DCN Manager');
      });
      it('Should revert if label is empty', async () => {
        const { dcnManager, admin } = await loadFixture(setupBasic);

        await expect(
          dcnManager
            .connect(admin)
            .mintTLD(admin.address, '', C.EXPIRATION_1_YEAR)
        ).to.be.revertedWith('Empty label');
      });
    });

    context('State change', () => {
      const mockTldNamehash = namehash(C.MOCK_TLD);

      it('Should mint token to the specified owner', async () => {
        const tokenId = ethers.BigNumber.from(mockTldNamehash).toString();
        const { admin, dcnManager, dcnRegistry } = await loadFixture(setupBasic);

        await dcnManager
          .connect(admin)
          .mintTLD(admin.address, C.MOCK_TLD, C.EXPIRATION_1_YEAR);

        expect(await dcnRegistry.ownerOf(tokenId)).to.equal(admin.address);
      });
      it('Should register resolver the default resolver if no resolver is set', async () => {
        const { admin, dcnManager, dcnRegistry, resolverInstance } = await loadFixture(setupBasic);

        await dcnManager
          .connect(admin)
          .mintTLD(admin.address, C.MOCK_TLD, C.EXPIRATION_1_YEAR);

        expect(await dcnRegistry.resolver(mockTldNamehash)).to.equal(resolverInstance.address);
      });
      it('Should register expiration', async () => {
        const timeStamp = await time.latest();
        const tldExpires = ethers.BigNumber.from(C.EXPIRATION_1_YEAR).add(timeStamp);
        const { admin, dcnManager, dcnRegistry } = await loadFixture(setupBasic);

        await dcnManager
          .connect(admin)
          .mintTLD(admin.address, C.MOCK_TLD, C.EXPIRATION_1_YEAR);

        expect(await dcnRegistry.expires(mockTldNamehash)).to.gte(tldExpires);
      });
    });

    // context('Events', () => {
    //   it('Should emit NewExpiration event with correct params', async () => {
    //     const { admin, dcnManager, dcnRegistry } = await loadFixture(setupBasic);
    //     const mockTldNamehash = namehash(C.MOCK_TLD);
    //     const timeStamp = await time.latest();
    //     const tldExpires = ethers.BigNumber.from(C.EXPIRATION_1_YEAR).add(timeStamp);
    //     console.log(mockTldNamehash)


    //     const tx = await dcnManager
    //         .connect(admin)
    //         .mintTLD(admin.address, C.MOCK_TLD, C.EXPIRATION_1_YEAR);
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
      it('Should revert if caller is not the DCN Manager', async () => {
        const { user1, dcnRegistry } = await loadFixture(setupTldMinted);

        await expect(
          dcnRegistry
            .connect(user1)
            .mint(user1.address, C.MOCK_LABELS, C.ZERO_ADDRESS, C.EXPIRATION_1_YEAR)
        ).to.be.revertedWith('Only DCN Manager');
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
            .mint(user1.address, C.MOCK_LABELS, C.EXPIRATION_1_YEAR, 0)
        ).to.be.revertedWith('Parent node does not exist');
      });
      it('Should revert if label is empty', async () => {
        const { user1, dcnManager } = await loadFixture(setupTldMinted);

        await expect(
          dcnManager
            .connect(user1)
            .mint(user1.address, ['', C.MOCK_TLD], C.EXPIRATION_1_YEAR, 0)
        ).to.be.revertedWith('Empty label');
      });
      it('Should revert if lables is below 2', async () => {
        const { user1, dcnManager } = await loadFixture(setupTldMinted);

        await expect(
          dcnManager
            .connect(user1)
            .mint(user1.address, [C.MOCK_TLD], C.EXPIRATION_1_YEAR, 0)
        ).to.be.revertedWith('Lables length below 2');
      });
    });

    context('State change', () => {
      it('Should mint token to the specified owner', async () => {
        const tokenId = ethers.BigNumber.from(mockNamehash).toString();
        const { user1, dcnManager, dcnRegistry } = await loadFixture(setupTldMinted);

        await dcnManager
          .connect(user1)
          .mint(user1.address, C.MOCK_LABELS, C.EXPIRATION_1_YEAR, 0);

        expect(await dcnRegistry.ownerOf(tokenId)).to.equal(user1.address);
      });
      it('Should register resolver the default resolver if no resolver is set', async () => {
        const { user1, dcnManager, dcnRegistry, resolverInstance } = await loadFixture(setupTldMinted);

        await dcnManager
          .connect(user1)
          .mint(user1.address, C.MOCK_LABELS, C.EXPIRATION_1_YEAR, 0);

        expect(await dcnRegistry.resolver(mockNamehash)).to.equal(resolverInstance.address);
      });
      it('Should register expiration', async () => {
        const timeStamp = await time.latest();
        const tldExpires = ethers.BigNumber.from(C.EXPIRATION_1_YEAR).add(timeStamp);
        const { user1, dcnManager, dcnRegistry } = await loadFixture(setupTldMinted);

        await dcnManager
          .connect(user1)
          .mint(user1.address, C.MOCK_LABELS, C.EXPIRATION_1_YEAR, 0);

        expect(await dcnRegistry.expires(mockNamehash)).to.equal(tldExpires);
      });
    });

    context('Events', () => {
      it('Should emit NewExpiration event with correct params', async () => {
        const timeStamp = await time.latest();
        const tldExpires = ethers.BigNumber.from(C.EXPIRATION_1_YEAR).add(timeStamp);
        const { user1, dcnManager, dcnRegistry } = await loadFixture(setupTldMinted);

        await expect(
          dcnManager
            .connect(user1)
            .mint(user1.address, C.MOCK_LABELS, C.EXPIRATION_1_YEAR, 0)
        )
          .to.emit(dcnRegistry, 'NewExpiration')
          .withArgs(mockNamehash, tldExpires);
      });
    });
  });

  describe('claim', () => {
    const mockNamehash = namehash(C.MOCK_LABELS);

    context('Error handling', () => {
      it.skip('Should revert if caller is not the DCN Manager', async () => {
        const { user1, dcnRegistry } = await loadFixture(setupVehicleMinted);
        console.log('here1')

        await expect(
          dcnRegistry
            .connect(user1)
            .claim(user1.address, mockNamehash, C.EXPIRATION_1_YEAR, 0)
        ).to.be.revertedWith('Only DCN Manager');
      });
      it('Should revert if node does not exist', async () => {
        const { user1, dcnManager } = await loadFixture(setupVehicleMinted);

        await expect(
          dcnManager
            .connect(user1)
            .claim(user1.address, mockNamehash, C.EXPIRATION_1_YEAR, 0)
        ).to.be.revertedWith('ERC721: invalid token ID');
      });
      it('Should revert if node does not exist', async () => {
        const { user1,  dcnManager } = await loadFixture(setupVehicleMinted);

        await expect(
          dcnManager
            .connect(user1)
            .claim(user1.address, mockNamehash, C.EXPIRATION_1_YEAR, 0)
        ).to.be.revertedWith('ERC721: invalid token ID');
      });
      it('Should revert if node is not yet expired', async () => {
        const { user1, user2, dcnManager, mockDimoToken } = await loadFixture(setupVehicleMinted);

        await dcnManager
          .connect(user1)
          .mint(user1.address, C.MOCK_LABELS, C.EXPIRATION_1_YEAR, 0);

        await mockDimoToken
          .connect(user2)
          .mint(C.ONE_MILLION);
        await mockDimoToken
          .connect(user2)
          .approve(dcnManager.address, C.ONE_MILLION);

        await expect(
          dcnManager
            .connect(user2)
            .claim(user2.address, mockNamehash, C.EXPIRATION_1_YEAR, 0)
        ).to.be.revertedWith('Not available');
      });
    });

    context('State change', () => {
      it('Should remint node to the new user', async () => {
        const { user1, user2, dcnManager, dcnRegistry, mockDimoToken } = await loadFixture(setupVehicleMinted);

        await dcnManager
          .connect(user1)
          .mint(user1.address, C.MOCK_LABELS, C.EXPIRATION_1_YEAR, 0);
        
        await time.increase(parseInt(C.EXPIRATION_1_YEAR) + 1);

        expect(await dcnRegistry.ownerOf(mockNamehash)).to.equal(user1.address);

        await mockDimoToken
          .connect(user2)
          .mint(C.ONE_MILLION);
        await mockDimoToken
          .connect(user2)
          .approve(dcnManager.address, C.ONE_MILLION);

        await dcnManager
          .connect(user2)
          .claim(user2.address, mockNamehash, C.EXPIRATION_1_YEAR, 0);
        
        expect(await dcnRegistry.ownerOf(mockNamehash)).to.equal(user2.address);
      });
    });
  });

  // describe('setRecord', () => {
  //   const mockTldNamehash = namehash(C.MOCK_TLD);

  //   context('Error handling', () => {
  //     it('Should revert if caller does not have the ADMIN_ROLE', async () => {
  //       const { nonAdmin, dcnManager } = await loadFixture(setupTldMinted);

  //       await expect(
  //         dcnManager
  //           .connect(nonAdmin)
  //           .setRecord(mockTldNamehash, C.ZERO_ADDRESS, C.EXPIRATION_1_YEAR)
  //       ).to.be.revertedWith(
  //         `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${C.ADMIN_ROLE
  //         }`
  //       );
  //     });
  //     it('Should revert if record does not exist', async () => {
  //       const mockTldNamehash = namehash(C.MOCK_TLD);
  //       const { admin, dcnManager } = await loadFixture(setupBasic);

  //       await expect(
  //         dcnManager
  //           .connect(admin)
  //           .setRecord(mockTldNamehash, C.ZERO_ADDRESS, C.EXPIRATION_1_YEAR)
  //       ).to.be.revertedWith('Node does not exist');
  //     });
  //   });

  //   context('State change', () => {
  //     it('Should register resolver the default resolver if no resolver is set', async () => {
  //       const { admin, dcnManager, dcnRegistry, resolverInstance } = await loadFixture(setupTldMinted);

  //       await dcnManager
  //         .connect(admin)
  //         .setRecord(mockTldNamehash, resolverInstance.address, C.EXPIRATION_1_YEAR)

  //       expect(await dcnRegistry.resolver(mockTldNamehash)).to.equal(resolverInstance.address);
  //     });
  //     it('Should register expiration', async () => {
  //       const timeStamp = await time.latest();
  //       const tldExpires2 = ethers.BigNumber.from(C.EXPIRATION_2_YEAR).add(timeStamp);
  //       const { admin, dcnManager, dcnRegistry } = await loadFixture(setupTldMinted);

  //       await dcnManager
  //         .connect(admin)
  //         .setRecord(mockTldNamehash, C.ZERO_ADDRESS, C.EXPIRATION_2_YEAR)

  //       expect(await dcnRegistry.expires(mockTldNamehash)).to.gte(tldExpires2);
  //     });
  //   });

  //   context('Events', () => {
  //     it('Should emit NewResolver event with correct params', async () => {
  //       const { admin, dcnManager, dcnRegistry, resolverInstance } = await loadFixture(setupTldMinted);

  //       await expect(
  //         dcnManager
  //           .connect(admin)
  //           .setRecord(mockTldNamehash, resolverInstance.address, C.EXPIRATION_1_YEAR)
  //       )
  //         .to.emit(dcnRegistry, 'NewResolver')
  //         .withArgs(mockTldNamehash, resolverInstance.address);
  //     });
  //     // it('Should emit NewExpiration event with correct params', async () => {
  //     //   const timeStamp = await time.latest();
  //     //   const tldExpires2 = ethers.BigNumber.from(C.EXPIRATION_2_YEAR).add(timeStamp);
  //     //   const { admin, dcnManager, dcnRegistry } = await loadFixture(setupTldMinted);

  //     //   await expect(
  //     //     dcnManager
  //     //       .connect(admin)
  //     //       .setRecord(mockTldNamehash, C.ZERO_ADDRESS, C.EXPIRATION_2_YEAR)
  //     //   )
  //     //     .to.emit(dcnRegistry, 'NewExpiration')
  //     //     .withArgs(mockTldNamehash, tldExpires2);
  //     // });
  //   });
  // });

  describe('setResolver', () => {
    const mockTldNamehash = namehash(C.MOCK_TLD);

    context('Error handling', () => {
      it('Should revert if caller is not the DCN Manager', async () => {
        const { nonAdmin, dcnRegistry } = await loadFixture(setupTldMinted);

        await expect(
          dcnRegistry
            .connect(nonAdmin)
            .setResolver(mockTldNamehash, C.ZERO_ADDRESS)
        ).to.be.revertedWith("Only DCN Manager");
      });
      it('Should revert if record does not exist', async () => {
        const { admin, dcnManager } = await loadFixture(setupBasic);

        await expect(
          dcnManager
            .connect(admin)
            .setResolver(mockTldNamehash, C.ZERO_ADDRESS)
        ).to.be.revertedWith('Node does not exist');
      });
    });

    context('State change', () => {
      it('Should register resolver the default resolver if no resolver is set', async () => {
        const { admin, dcnManager, dcnRegistry, resolverInstance } = await loadFixture(setupTldMinted);

        await dcnManager
          .connect(admin)
          .setResolver(mockTldNamehash, C.ZERO_ADDRESS)

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
      it('Should revert if caller is not the DCN Manager', async () => {
        const { nonAdmin, dcnRegistry } = await loadFixture(setupTldMinted);

        await expect(
          dcnRegistry
            .connect(nonAdmin)
            .setExpiration(mockTldNamehash, C.EXPIRATION_2_YEAR)
        ).to.be.revertedWith("Only DCN Manager");
      });
      it('Should revert if record does not exist', async () => {
        const { admin, dcnManager } = await loadFixture(setupBasic);

        await expect(
          dcnManager
            .connect(admin)
            .setExpiration(mockTldNamehash, C.EXPIRATION_2_YEAR)
        ).to.be.revertedWith('Node does not exist');
      });
      // TODO Test invalid duration
    });

    context('State change', () => {
      it('Should register expiration', async () => {
        const timeStamp = await time.latest();
        const tldExpires2 = ethers.BigNumber.from(C.EXPIRATION_2_YEAR).add(timeStamp);
        const { admin, dcnManager, dcnRegistry } = await loadFixture(setupTldMinted);

        await dcnManager
          .connect(admin)
          .setExpiration(mockTldNamehash, C.EXPIRATION_2_YEAR)

        expect(await dcnRegistry.expires(mockTldNamehash)).to.gte(tldExpires2);
      });
    });

    // context('Events', () => {
    //   it('Should emit NewExpiration event with correct params', async () => {
    //     const timeStamp = await time.latest();
    //     const tldExpires2 = ethers.BigNumber.from(C.EXPIRATION_2_YEAR).add(timeStamp);
    //     const { admin, dcnManager, dcnRegistry } = await loadFixture(setupTldMinted);

    //     await expect(
    //       dcnManager
    //         .connect(admin)
    //         .setExpiration(mockTldNamehash, C.EXPIRATION_2_YEAR)
    //     )
    //       .to.emit(dcnRegistry, 'NewExpiration')
    //       .withArgs(mockTldNamehash, tldExpires2);
    //   });
    // });
  });

  describe('Transferring', () => {
    it('Should revert if caller does not have the TRANSFERER_ROLE', async () => {
      const mockTldNamehash = namehash(C.MOCK_TLD);
      const tokenId = ethers.BigNumber.from(mockTldNamehash).toString();
      const { admin, user1, dcnManager, dcnRegistry } = await loadFixture(setupBasic);

      await dcnManager
        .connect(admin)
        .mintTLD(admin.address, C.MOCK_TLD, C.EXPIRATION_1_YEAR);

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
