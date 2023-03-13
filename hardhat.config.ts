import { HardhatUserConfig } from "hardhat/config"
import "@typechain/hardhat"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-ethers"
import "hardhat-gas-reporter"
import "dotenv/config"
import "solidity-coverage"
import "hardhat-deploy"

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL || ""
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || ""
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ""
const PRIVATE_KEY = process.env.PRIVATE_KEY || ""

const UNISWAP_SETTING = {
    version: "0.7.6",
    settings: {
        optimizer: {
            enabled: true,
            runs: 2_000,
        },
    },
}

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: "0.8.4",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            UNISWAP_SETTING,
        ],
        overrides: {
            "@uniswap/v3-core/contracts/libraries/FullMath.sol": UNISWAP_SETTING,
            "@uniswap/v3-core/contracts/libraries/TickMath.sol": UNISWAP_SETTING,
            "@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol": UNISWAP_SETTING,
        },
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            forking: {
                url: MAINNET_RPC_URL,
            },
        },
        local: {
            url: "http://127.0.0.1:8545/",
        },
        goerli: {
            url: GOERLI_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 5,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
            1: 0,
        },
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
}

export default config
