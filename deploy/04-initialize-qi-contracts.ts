import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import {
    networkConfig,
    qiBackgroundBaseURI,
    qiBackgroundRoyaltiesFeeNumerator,
    qiBaseURI,
    qiRoyaltiesFeeNumerator,
} from "../helper-hardhat-config"
import { Qi, QiBackground, QiTreasury } from "../typechain-types"
import { QiVRFConsumer } from "../typechain-types/contracts/Qi"
import VRFConsumerConfigStruct = QiVRFConsumer.VRFConsumerConfigStruct

const FUND_AMOUNT = "1000000000000000000000"

const deployQiBackground: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, network, ethers } = hre
    const { log } = deployments
    const chainId = network.config.chainId!

    const qiTransparentProxy = await ethers.getContract("Qi_Proxy")
    const qiBackgroundTransparentProxy = await ethers.getContract("QiBackground_Proxy")

    const qiTreasury: QiTreasury = await ethers.getContract("QiTreasury")
    const yamGovernance = networkConfig[chainId].yamGovernance!

    log("Initializing Qi...")

    const qi: Qi = await ethers.getContractAt("Qi", qiTransparentProxy.address)

    const qiInitializeTx = await qi.initialize(
        qiBaseURI,
        qiBackgroundTransparentProxy.address,
        qiTreasury.address,
        qiRoyaltiesFeeNumerator,
        yamGovernance
    )

    await qiInitializeTx.wait(1)
    log("Qi Initialized!")

    log("Initializing QiBackground...")

    const qiBackground: QiBackground = await ethers.getContractAt(
        "QiBackground",
        qiBackgroundTransparentProxy.address
    )

    const tx = await qiBackground.initialize(
        qiBackgroundBaseURI,
        qiTransparentProxy.address,
        qiTreasury.address,
        qiBackgroundRoyaltiesFeeNumerator
    )
    await tx.wait(1)

    log("QiBackground Initialized!")
    log("----------------------------------")
}
export default deployQiBackground
deployQiBackground.tags = ["all", "contracts", "main"]
