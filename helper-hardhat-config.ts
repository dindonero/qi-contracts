export type NetworkConfigItem = {
    name?: string
    //ERC20 tokens
    wstETH?: string
    WETH?: string
    DAI?: string
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
}

export type NetworkConfigInfo = {
    [key: number]: NetworkConfigItem
}

export const networkConfig: NetworkConfigInfo = {
    31337: {
        name: "hardhat",
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        callbackGasLimit: "500000",
        swapRouter: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
        wstETH: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
        WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        yamGovernance: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // deployer TODO: change to yam governance
        teamMultisig: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // deployer TODO: change to team multisig
    },
    5: {
        name: "goerli",
        subscriptionId: "10993", // todo for chainlink vrf
        vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        callbackGasLimit: "500000",
        swapRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
        wstETH: "0x6320cd32aa674d2898a68ec82e869385fc5f7e2f",
        WETH: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
        DAI: "0xdc31ee1784292379fbb2964b3b9c4124d8f89c60",
        yamGovernance: "0xA3f4d9497Bf09800a76472251fAdaa86B1Af9c01", // deployer TODO: change to yam governance
        teamMultisig: "0xA3f4d9497Bf09800a76472251fAdaa86B1Af9c01", // deployer TODO: change to team multisig
    },
}

export const developmentChains = ["hardhat", "localhost", "local"]
export const qiBaseURI = "https://api.qi.io/nft/" // TODO: Change this to the correct baseURI
export const qiBackgroundBaseURI = "https://api.qi.io/nft-background/" // TODO: Change this to the correct baseURI

export const qiRoyaltiesFeeNumerator = "300" // TODO: check this value. Denominator 10000 -- so 300 = 3%

export const qiBackgroundRoyaltiesFeeNumerator = "300" // TODO: check this value. Denominator 10000 -- so 300 = 3%

export const frontEndContractsFile = "../qi-marketplace/constants/networkMapping.json"
export const frontEndAbiLocation = "../qi-marketplace/constants/"
