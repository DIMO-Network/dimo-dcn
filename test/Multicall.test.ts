import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { C, namehash, setupVehicleMinted } from '../utils';

describe('Multicall', () => {
  describe('multiStaticCall', () => {
    const mockNodeNamehash = namehash(C.MOCK_LABELS);

    it('Should return node information from resolvers', async () => {
      const { user1, dcnManager, nameResolverInstance, vehicleIdResolverInstance, multicallInstance } = await loadFixture(setupVehicleMinted);

      await dcnManager
        .connect(user1)
        .mint(user1.address, C.MOCK_LABELS, C.ONE_YEAR, C.MOCK_VEHICLE_TOKEN_ID);

      const getName = nameResolverInstance.interface.encodeFunctionData(
        'name',
        [mockNodeNamehash]
      );
      const getVehicleId = vehicleIdResolverInstance.interface.encodeFunctionData(
        'vehicleId',
        [mockNodeNamehash]
      );
      const getNodeByVehicleId = vehicleIdResolverInstance.interface.encodeFunctionData(
        'nodeByVehicleId',
        [C.MOCK_VEHICLE_TOKEN_ID]
      );

      const results = await multicallInstance.multiStaticCall([getName, getVehicleId, getNodeByVehicleId]);

      expect(results.length).to.be.equal(3);

      const name = nameResolverInstance.interface.getAbiCoder().decode(["string"], results[0])[0];
      const vehicleId = vehicleIdResolverInstance.interface.getAbiCoder().decode(["uint256"], results[1])[0];
      const nodeNamehash = vehicleIdResolverInstance.interface.getAbiCoder().decode(["bytes32"], results[2])[0];

      expect(name).to.be.equal(C.MOCK_LABELS.join('.'));
      expect(vehicleId).to.be.equal(C.MOCK_VEHICLE_TOKEN_ID);
      expect(nodeNamehash).to.be.equal(mockNodeNamehash);
    });
  });
});