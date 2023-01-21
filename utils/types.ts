export interface ContractAddressesByNetwork {
    [index: string]: {
        resolvers: {
            [index: string]: {
                address: string,
                selectors: string[]
            }
        },
        contracts: {
            [index: string]: {
                proxy: string,
                implementation: string
            }
        }
    };
}

export interface NetworkValue {
    [index: string]: string;
}