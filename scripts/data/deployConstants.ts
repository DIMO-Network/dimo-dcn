import { ethers, network } from 'hardhat';
import { NetworkValue } from '../../utils';

export const DEFAULT_ADMIN_ROLE =
    '0x0000000000000000000000000000000000000000000000000000000000000000';
export const ADMIN_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes('ADMIN_ROLE')
);
export const TLD_MINTER_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes('TLD_MINTER_ROLE')
);
export const MINTER_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes('MINTER_ROLE')
);
export const UPGRADER_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes('UPGRADER_ROLE')
);
export const TRANSFERER_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes('TRANSFERER_ROLE')
);
export const MANAGER_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes('MANAGER_ROLE')
);
export const MANAGER_RESOLVER_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes('MANAGER_RESOLVER_ROLE')
);

export const networkName = network.name;
export const dimoToken: NetworkValue = {
    amoy: '0x21cFE003997fB7c2B3cfe5cf71e7833B7B2eCe10',
    mumbai: '0x80ee7ec4493a1d7975ab900f94db25ba7c688201',
    polygon: '0xe261d618a959afffd53168cd07d12e37b26761db',
    hardhat: '0xffffffffffffffffffffffffffffffffffffffff',
    localhost: '0xffffffffffffffffffffffffffffffffffffffff'
};
export const foundationAddress: NetworkValue = {
    amoy: '0x07B584f6a7125491C991ca2a45ab9e641B1CeE1b',
    mumbai: '0x1741ec2915ab71fc03492715b5640133da69420b',
    polygon: '0xCED3c922200559128930180d3f0bfFd4d9f4F123',
    hardhat: '0xffffffffffffffffffffffffffffffffffffffff',
    localhost: '0xffffffffffffffffffffffffffffffffffffffff'
};
export const dimoVehicleIdAddress: NetworkValue = {
    amoy: '0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8',
    mumbai: '0x90C4D6113Ec88dd4BDf12f26DB2b3998fd13A144',
    polygon: '0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF',
    hardhat: '0xffffffffffffffffffffffffffffffffffffffff',
    localhost: '0xffffffffffffffffffffffffffffffffffffffff'
}

export const DCN_REGISTRY_NFT_NAME = 'Dimo Canonical Name';
export const DCN_REGISTRY_NFT_SYMBOL = 'DCN';
export const DCN_REGISTRY_NFT_BASE_URI = 'https://devices-api.dimo.zone/v1/dcn/';

export const PRICE_MANAGER_BASE_PRICE = '792744799594'; // 25 / (60 * 60 * 24 * 365), $25 DIMO per year