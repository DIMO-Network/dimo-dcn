import { ethers, network } from 'hardhat';
import { NetworkValue } from '../../utils';

export const DEFAULT_ADMIN_ROLE =
    '0x0000000000000000000000000000000000000000000000000000000000000000';
export const ADMIN_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes('ADMIN_ROLE')
);
export const MINTER_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes('MINTER_ROLE')
);
export const UPGRADER_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes('UPGRADER_ROLE')
);
export const TRANSFERER_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes('TRANSFERER_ROLE')
);

export const networkName = network.name;
export const foundationAddress: NetworkValue = {
  mumbai: '0x1741ec2915ab71fc03492715b5640133da69420b',
  polygon: '0xCED3c922200559128930180d3f0bfFd4d9f4F123',
  hardhat: '0xffffffffffffffffffffffffffffffffffffffff',
  localhost: '0xffffffffffffffffffffffffffffffffffffffff'
};

export const DCN_REGISTRY_NFT_NAME = 'Dimo Canonical Name';
export const DCN_REGISTRY_NFT_SYMBOL = 'DCN';
export const DCN_REGISTRY_NFT_BASE_URI = 'https://dimo.zone/dcn/';