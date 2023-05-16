# DIMO Canonical Name (DCN)

## Documentation

- [Dimo documentation](https://docs.dimo.zone/docs)

## How to run

You can execute the following commands to build the project and run additional scripts:

```sh
# Installs dependencies
npm i

# Clears cache, compiles contracts, generates typechain files and ABIs
npm run build

# Outputs contract sizes
npm run contract-sizer
```

You can deploy the whole system running the following script, where `network_name` is one of the networks available in [hardhat.config.ts](./hardhat.config.ts). Deployed contract addresses will be written in [scripts/data/addresses.json](./scripts/data/addresses.json):

```sh
npx hardhat run scripts/deploy.ts --network '<network_name>'
```

You can easily add/remove/update modules from the `ResolverRegistry` and update the remaining upgradeable contracts (`DcnManager`, `DcnRegistry`, `PriceManager`). Just make sure to update the `main` function accordingly:

```sh
npx hardhat run scripts/upgrade.ts --network '<network_name>'
```

You can also verify contracts in etherscan/polygonscan/etc running the following command. Remove `<constructor_arguments>` if there isn't any.

```sh
npx hardhat verify '<deployed_contract_address>' '<constructor_arguments>' --network '<network_name>'

# Use this flag to specify the contract implementation if needed
npx hardhat verify '<deployed_contract_address>' '<constructor_arguments>' --network '<network_name>' --contract '<contract_path>:<contract_name>'
```

## Testing

The test suite is organized in different files according to the contract name `<ContractName>.test.ts`. Each file groups the tests by function name, covering, respectively, reverts, state modification and events. You can run the test suite with the following commands:

```sh
# Runs test suite
npm run test

# Runs solidity coverage
npm run coverage

# Runs test suite and output gas report
npm run gas-report
```

## ABI generator

The ABIs of the `DcnManager`, `DcnRegistry` and `PriceManager` are automatically generated when the project is built. However, the `Resolvers` follow a different pattern that has the `ResolverRegistry` as an entry point and proxy storage, and it has the other functions spread across several implementation contracts (`NameResolver`, `VehicleIdResolver`, `Shared`). That said, interacting with it requires a massive ABI containing all available functions is needed. You can generated this ABI running the follwing command:

```sh
npx hardhat run scripts/abiGenerator.ts
```

The output file will be saved in `./abis/ResolverRegistry.json`.