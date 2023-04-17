import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { C, namehash, setupVehicleMinted } from '../utils';

describe('Multicall', () => {
  describe('multiStaticCall', () => {
    const mockNodeNamehash = namehash(C.MOCK_LABELS);

    it('Should return node information from resolvers', async () => {
      const { user1, dcnManager, nameResolverInstance, vehicleIdResolverInstance, multicallInstance } = await loadFixture(setupVehicleMinted);

      const nameResolverInterface = ethers.Contract.getInterface(nameResolverInstance.interface);
      const vehicleIdResolverInterface = ethers.Contract.getInterface(vehicleIdResolverInstance.interface);

      await dcnManager
        .connect(user1)
        .mint(user1.address, C.MOCK_LABELS, C.ONE_YEAR, C.MOCK_VEHICLE_TOKEN_ID);

      const getName = nameResolverInterface.encodeFunctionData(
        'name',
        [mockNodeNamehash]
      );
      const getVehicleId = vehicleIdResolverInterface.encodeFunctionData(
        'vehicleId',
        [mockNodeNamehash]
      );
      const getNodeByVehicleId = vehicleIdResolverInterface.encodeFunctionData(
        'nodeByVehicleId',
        [C.MOCK_VEHICLE_TOKEN_ID]
      );

      const results = await multicallInstance.multiStaticCall([getName, getVehicleId, getNodeByVehicleId]);

      expect(results.length).to.be.equal(3);

      const name = ethers.utils.defaultAbiCoder.decode(["string"], results[0])[0];
      const vehicleId = ethers.utils.defaultAbiCoder.decode(["uint256"], results[1])[0];
      const nodeNamehash = ethers.utils.defaultAbiCoder.decode(["bytes32"], results[2])[0];

      expect(name).to.be.equal(C.MOCK_LABELS.join('.'));
      expect(vehicleId).to.be.equal(C.MOCK_VEHICLE_TOKEN_ID);
      expect(nodeNamehash).to.be.equal(mockNodeNamehash);
    });
  });
});