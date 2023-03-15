import {DeployFunction} from "hardhat-deploy/types"
import {HardhatRuntimeEnvironment} from "hardhat/types"
import {networkConfig} from "../helper-hardhat-config";

const FUND_AMOUNT = "1000000000000000000000"

const deployQiBackground: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment
) {
    const {deployments, getNamedAccounts, network, ethers} = hre
    const {deploy, log} = deployments
    const {deployer} = await getNamedAccounts()
    const chainId = network.config.chainId!

    let vrfCoordinatorV2Address, subscriptionId

    if (chainId == 31337) {
        // create VRFV2 Subscription
        console.log("Creating VRF Subscription...")
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait()
        subscriptionId = transactionReceipt.events[0].args.subId
        // Fund the subscription
        // Our mock makes it, so we don't actually have to worry about sending fund
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }

    const vrfConfig = {
        vrfConsumerBase: vrfCoordinatorV2Address,
        subscriptionId: subscriptionId,
        gasLane: networkConfig[chainId].gasLane,
        callbackGasLimit: networkConfig[chainId].callbackGasLimit
    }

    const baseURI = "https://api.qi.io/nft/" // TODO: Change this to the correct baseURI


    log("Deploying QiBackground...")
    await deploy("QiBackground", {
        from: deployer,
        log: true,
        args: [],
        proxy: {
            proxyContract: "OpenZeppelinTransparentProxy",
            viaAdminContract: {
                name: "QiBackgroundProxyAdmin",
                artifact: "QiBackgroundProxyAdmin",
            },
        }
    })

    log("QiBackground Deployed!")
    log("Initializing QiBackground...")

    const transparentProxy = await ethers.getContract("QiBackground_Proxy")
    const qiBackground = await ethers.getContractAt("QiBackground", transparentProxy.address)

    const tx = await qiBackground.initialize(vrfConfig, baseURI)
    await tx.wait(1)

    log("QiBackground Initialized!")
    log("----------------------------------")
}
export default deployQiBackground
deployQiBackground.tags = ["all", "contracts", "main"]