
export type NetworkConfigItem = {
    name?: string,
    // Chalink vrf config
    subscriptionId?: string,
    vrfCoordinatorV2?: string,
    gasLane?: string,
    callbackGasLimit?: string,
    // Lido address
    lidoAddress?: string,
    // Uniswap Addresses
    uniswapV3Factory?: string,
    uniswapV3Router?: string,
}

export type NetworkConfigInfo = {
    [key: number]: NetworkConfigItem
}

export const networkConfig: NetworkConfigInfo = {
    31337: {
        name: "hardhat",
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        callbackGasLimit: "500000",
        lidoAddress: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",

    },
    5: {
        name: "goerli",
        subscriptionId: "", // todo for chainlink vrf
        vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        callbackGasLimit: "500000"
    }
}

export const developmentChains = ["hardhat", "localhost"]
