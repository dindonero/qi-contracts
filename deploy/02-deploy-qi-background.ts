import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const deployQiBackground: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

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
        },
    })

    log("QiBackground Deployed!")
    log("----------------------------------")
}
export default deployQiBackground
deployQiBackground.tags = ["all", "qiBackground", "contracts", "main"]
