export type NetworkConfigItem = {
    name?: string
    //ERC20 tokens
    wstETH?: string
    WETH?: string
    // Chalink vrf config
    subscriptionId?: string
    vrfCoordinatorV2?: string
    gasLane?: string
    callbackGasLimit?: string
    // Uniswap Addresses
    swapRouter?: string
    // Yam and team addresses
    yamGovernance?: string
    teamMultisig?: string

    royaltiesFeeNumerator?: string
}

export type NetworkConfigInfo = {
    [key: number]: NetworkConfigItem
}

export const networkConfig: NetworkConfigInfo = {
    31337: {
        name: "hardhat",
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        callbackGasLimit: "500000",
        swapRouter: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        wstETH: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
        WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        yamGovernance: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // deployer TODO: change to yam governance
        teamMultisig: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // deployer TODO: change to team multisig
        royaltiesFeeNumerator: "30000", // Denominator 10000 -- so 30000 = 3%
    },
    5: {
        name: "goerli",
        subscriptionId: "", // todo for chainlink vrf
        vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        callbackGasLimit: "500000",
        swapRouter: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        wstETH: "0x6320cd32aa674d2898a68ec82e869385fc5f7e2f",
        WETH: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
        yamGovernance: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // deployer TODO: change to yam governance
        teamMultisig: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // deployer TODO: change to team multisig
        royaltiesFeeNumerator: "30000", // Denominator 10000 -- so 30000 = 3%
    },
}

export const developmentChains = ["hardhat", "localhost"]
