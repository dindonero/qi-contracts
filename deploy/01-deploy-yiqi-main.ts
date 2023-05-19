import {DeployFunction} from "hardhat-deploy/types"
import {HardhatRuntimeEnvironment} from "hardhat/types"

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
    log("----------------------------------")
}
export default deployYiqi
deployYiqi.tags = ["all", "yiqi", "contracts", "main"]
