import { ethers } from 'hardhat';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const MAX_UINT_256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
export const ONE_MILLION = '1000000000000000000000000';
export const HALF_YEAR = 60 * 60 * 24 * 182;
export const ONE_YEAR = 60 * 60 * 24 * 365;
export const TWO_YEARS = 60 * 60 * 24 * 365 * 2;
export const MINTING_COST = '792744799594'; // 25 / (60 * 60 * 24 * 365), $25 DIMO per year
export const MOCK_VEHICLE_TOKEN_ID = 1;

export const BYTES_32_ZER0 = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const DEFAULT_ADMIN_ROLE =
    '0x0000000000000000000000000000000000000000000000000000000000000000';
export const ADMIN_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes('ADMIN_ROLE')
);
export const TLD_MINTER_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes('TLD_MINTER_ROLE')
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
export const MANAGER_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes('MANAGER_ROLE')
);

export const DCN_REGISTRY_NFT_NAME = 'Dimo Canonical Name';
export const DCN_REGISTRY_NFT_SYMBOL = 'DCN';
export const DCN_REGISTRY_NFT_BASE_URI = 'https://dimo.zone/dcn/';

export const MOCK_TLD = 'dimo';
export const MOCK_LABELS = ['label1', 'dimo'];
export const MOCK_LABELS_UPPERCASE = ['LABEL1', 'dimo'];

// Invalid labels
export const MOCK_LABELS_3 = ['label2', 'label1', 'dimo'];
export const MOCK_LABELS_SHORT = ['l', 'dimo'];
export const MOCK_LABELS_LONG = ['labelabelabelabelabelabelabel', 'dimo'];
export const MOCK_LABELS_WRONG_CHARS = ['Ln57&%_', 'dimo'];

// Unallowed labels
export const MOCK_UNALLOWED_LABEL_1 = 'unallowedlabel1';
export const MOCK_UNALLOWED_LABEL_2 = 'unallowedlabel2';
export const MOCK_UNALLOWED_LABEL_3 = 'unallowedlabel3';
export const MOCK_UNALLOWED_LABELS = [MOCK_UNALLOWED_LABEL_1, MOCK_UNALLOWED_LABEL_2, MOCK_UNALLOWED_LABEL_3];