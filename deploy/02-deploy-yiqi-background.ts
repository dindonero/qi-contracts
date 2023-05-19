import {DeployFunction} from "hardhat-deploy/types"
import {HardhatRuntimeEnvironment} from "hardhat/types"
import {ethers} from "hardhat";

const deployYiqiBackground: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const yiqiTransparentProxy = await ethers.getContract("Yiqi_Proxy")

    const args = [
        yiqiTransparentProxy.address
    ]

    log("Deploying YiqiBackground...")
    await deploy("YiqiBackground", {
        from: deployer,
        log: true,
        args: args,
        proxy: {
            proxyContract: "OpenZeppelinTransparentProxy",
            viaAdminContract: {
                name: "YiqiBackgroundProxyAdmin",
                artifact: "YiqiBackgroundProxyAdmin",
            },
        },
    })

    log("YiqiBackground Deployed!")
    log("----------------------------------")
}
export default deployYiqiBackground
deployYiqiBackground.tags = ["all", "yiqiBackground", "contracts", "main"]
