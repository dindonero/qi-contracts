# Qi Hardhat Contracts

This repo holds Qi main and background contracts developed using Hardhat and Typescript.

## Installation

1. Clone the repository and install the dependencies.
```bash
git clone https://github.com/dindonero/qi-contracts.git
cd qi-contracts
yarn install
```
2. (Optional: Goerli) Create a `.env` file in the root directory and add the following environment variables:
```bash
MAINNET_RPC_URL=
GOERLI_RPC_URL=
PRIVATE_KEY=
ETHERSCAN_API_KEY=
UPDATE_FRONT_END=
```

### Deploy the contract

```bash
yarn deploy
```

### Run the tests
```bash
yarn test
```

### Get coverage
```bash
yarn hardhat coverage
```
