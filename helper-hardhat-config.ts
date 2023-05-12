export type NetworkConfigItem = {
    name?: string
    //ERC20 tokens
    stEth?: string
    WETH?: string
    // Curve pool Addresses
    curveEthStEthPool?: string
    // Yam and team addresses
    yamGovernance?: string
    yamReserves?: string
    teamMultisig?: string
}

export type NetworkConfigInfo = {
    [key: number]: NetworkConfigItem
}

export const networkConfig: NetworkConfigInfo = {
    31337: {
        name: "hardhat",
        curveEthStEthPool: "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022",
        stEth: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
        WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        yamGovernance: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // deployer TODO: change to yam governance
        yamReserves: "0x97990B693835da58A281636296D2Bf02787DEa17",
        teamMultisig: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // deployer TODO: change to team multisig
    },
    5: {
        name: "goerli",
        curveEthStEthPool: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
        stEth: "",
        yamGovernance: "0xA3f4d9497Bf09800a76472251fAdaa86B1Af9c01", // deployer TODO: change to yam governance
        yamReserves: "0x97990B693835da58A281636296D2Bf02787DEa17",
        teamMultisig: "0xA3f4d9497Bf09800a76472251fAdaa86B1Af9c01", // deployer TODO: change to team multisig
    },
    11155111: {
        name: "sepolia",
        curveEthStEthPool: "", // TODO: change to sepolia curve pool
        stEth: "",
        DAI: "0xdc31ee1784292379fbb2964b3b9c4124d8f89c60",
        yamGovernance: "0xA3f4d9497Bf09800a76472251fAdaa86B1Af9c01", // deployer TODO: change to yam governance
        yamReserves: "0x97990B693835da58A281636296D2Bf02787DEa17",
        teamMultisig: "0xA3f4d9497Bf09800a76472251fAdaa86B1Af9c01", // deployer TODO: change to team multisig
    },
}

export const developmentChains = ["hardhat", "localhost", "local"]
export const qiBaseURI = "https://api.qi.io/token/" // TODO: Change this to the correct baseURI
export const qiBackgroundBaseURI = "https://api.qi.io/background/" // TODO: Change this to the correct baseURI

export const qiRoyaltiesFeeNumerator = "300" // TODO: check this value. Denominator 10000 -- so 300 = 3%

export const qiBackgroundRoyaltiesFeeNumerator = "300" // TODO: check this value. Denominator 10000 -- so 300 = 3%

export const frontEndContractsFile = "../qi-marketplace/constants/networkMapping.json"
export const frontEndAbiLocation = "../qi-marketplace/constants/"
