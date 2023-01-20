import { ethers } from 'hardhat';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const MAX_UINT_72 = '4722366482869645213695';

export const BYTES_32_ZER0 = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const DEFAULT_ADMIN_ROLE =
    '0x0000000000000000000000000000000000000000000000000000000000000000';
export const ADMIN_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes('ADMIN_ROLE')
);
export const MINTER_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes('MINTER_ROLE')
);
export const BURNER_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes('BURNER_ROLE')
);
export const UPGRADER_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes('UPGRADER_ROLE')
);
export const TRANSFERER_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes('TRANSFERER_ROLE')
);

export const DCN_REGISTRY_NFT_NAME = 'Dimo Canonical Name';
export const DCN_REGISTRY_NFT_SYMBOL = 'DCN';
export const DCN_REGISTRY_NFT_BASE_URI = 'https://dimo.zone/dcn/';

export const MOCK_TLD = 'dimo';
export const MOCK_LABELS = ['label1', 'dimo'];