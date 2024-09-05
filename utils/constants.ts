import { ethers } from 'hardhat';

export const ONE_MILLION = '1000000000000000000000000';
export const HALF_YEAR = 60 * 60 * 24 * 182;
export const ONE_YEAR = 60 * 60 * 24 * 365;
export const TWO_YEARS = 60 * 60 * 24 * 365 * 2;
export const MINTING_COST = '792744799594'; // 25 / (60 * 60 * 24 * 365), $25 DIMO per year
export const MOCK_VEHICLE_TOKEN_ID = 1;

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

export const DCN_REGISTRY_NFT_NAME = 'Dimo Canonical Name';
export const DCN_REGISTRY_NFT_SYMBOL = 'DCN';
export const DCN_REGISTRY_NFT_BASE_URI = 'https://dimo.zone/dcn/';

export const MOCK_INVALID_TLD = 'invalidtld';
export const MOCK_TLD = 'dimo';
export const MOCK_LABELS = ['label_1', 'dimo'];
export const MOCK_LABELS_UPPERCASE = ['LABEL_1', 'dimo'];

// Invalid labels
export const MOCK_LABELS_3 = ['label_2', 'label_1', 'dimo'];
export const MOCK_LABELS_SHORT = ['l', 'dimo'];
export const MOCK_LABELS_LONG = ['labelabelabelabelabelabelabel', 'dimo'];
export const MOCK_LABELS_WRONG_CHARS = ['Ln57&%', 'dimo'];

// Disallowed labels
export const MOCK_DISALLOWED_LABEL_1 = 'disallowed1';
export const MOCK_DISALLOWED_LABEL_2 = 'disallowed2';
export const MOCK_DISALLOWED_LABEL_3 = 'disallowed3';
export const MOCK_DISALLOWED_LABELS = [MOCK_DISALLOWED_LABEL_1, MOCK_DISALLOWED_LABEL_2, MOCK_DISALLOWED_LABEL_3];