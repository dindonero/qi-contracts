import {DeployFunction} from "hardhat-deploy/types"
import {HardhatRuntimeEnvironment} from "hardhat/types"
import verify from "../utils/verifyOnEtherscan";
import {ethers, network} from "hardhat";
import {developmentChains} from "../helper-hardhat-config";

const deployYiqi: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    log("Deploying Yiqi...")
    await deploy("Yiqi", {
        from: deployer,
        log: true,
        args: [],
        proxy: {
            proxyContract: "OpenZeppelinTransparentProxy",
            viaAdminContract: {
                name: "YiqiProxyAdmin",
                artifact: "YiqiProxyAdmin",
            },
        },
    })

    log("Yiqi Deployed!")

    if (!developmentChains.includes(network.name) && process.env.VERIFY_ON_ETHERSCAN === "true")
        await verify((await ethers.getContract("Yiqi_Implementation")).address, [])
    log("----------------------------------")

}
export default deployYiqi
deployYiqi.tags = ["all", "yiqi", "contracts", "main"]
