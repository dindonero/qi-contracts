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

    let vrfCoordinatorV2Address, subscriptionId

    if (chainId == 31337) {
        // create VRFV2 Subscription
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait()
        subscriptionId = transactionReceipt.events[0].args.subId
        // Fund the subscription
        // Our mock makes it, so we don't actually have to worry about sending fund
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, qiTransparentProxy.address)
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, qiBackgroundTransparentProxy.address)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }

    const vrfConfig: VRFConsumerConfigStruct = {
        vrfConsumerBase: vrfCoordinatorV2Address!,
        subscriptionId: subscriptionId,
        gasLane: networkConfig[chainId].gasLane!,
        callbackGasLimit: networkConfig[chainId].callbackGasLimit!,
    }

    const wstETH = networkConfig[chainId].wstETH!
    const qiTreasury: QiTreasury = await ethers.getContract("QiTreasury")
    const teamMultisig = networkConfig[chainId].teamMultisig!
    const yamGovernance = networkConfig[chainId].yamGovernance!

    log("Initializing Qi...")

    const qi: Qi = await ethers.getContractAt("Qi", qiTransparentProxy.address)

    const qiInitializeTx = await qi.initialize(
        vrfConfig,
        qiBackgroundTransparentProxy.address,
        wstETH,
        qiBaseURI,
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
        vrfConfig,
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
