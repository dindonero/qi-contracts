import {DeployFunction} from "hardhat-deploy/types"
import {HardhatRuntimeEnvironment} from "hardhat/types"
import {
    networkConfig, yiqiBackgroundBaseURI,
    yiqiBackgroundRoyaltiesFeeNumerator,
    yiqiBaseURI,
    yiqiRoyaltiesFeeNumerator,
} from "../helper-hardhat-config"
import {Yiqi, YiqiBackground, YiqiTreasury} from "../typechain-types"
import {ethers} from "hardhat";

const deployYiqiBackground: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, network, ethers } = hre
    const { log } = deployments
    const chainId = network.config.chainId!

    const yiqiTransparentProxy = await ethers.getContract("Yiqi_Proxy")
    const yiqiBackgroundTransparentProxy = await ethers.getContract("YiqiBackground_Proxy")

    const yiqiTreasury: YiqiTreasury = await ethers.getContract("YiqiTreasury")

    const yamGovernance = networkConfig[chainId].yamGovernance!

    log("Initializing Yiqi...")

    const yiqi: Yiqi = await ethers.getContractAt("Yiqi", yiqiTransparentProxy.address)

    const yiqiInitializeTx = await yiqi.initialize(
        yiqiBackgroundTransparentProxy.address,
        yiqiTreasury.address,
        yiqiBaseURI,
        yiqiRoyaltiesFeeNumerator,
        yamGovernance
    )

    await yiqiInitializeTx.wait(1)
    log("Yiqi Initialized!")

    log("Initializing YiqiBackground...")

    const yiqiBackground: YiqiBackground = await ethers.getContractAt(
        "YiqiBackground",
        yiqiBackgroundTransparentProxy.address
    )

    const tx = await yiqiBackground.initialize(
        yiqiTreasury.address,
        yiqiBackgroundBaseURI,
        yiqiBackgroundRoyaltiesFeeNumerator
    )
    await tx.wait(1)

    log("YiqiBackground Initialized!")
    log("----------------------------------")
}
export default deployYiqiBackground
deployYiqiBackground.tags = ["all", "contracts", "main"]
