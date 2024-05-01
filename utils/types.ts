export interface AddressesByNetwork {
    [index: string]: {
        modules: {
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