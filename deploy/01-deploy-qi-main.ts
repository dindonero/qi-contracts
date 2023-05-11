import {DeployFunction} from "hardhat-deploy/types"
import {HardhatRuntimeEnvironment} from "hardhat/types"

const deployQi: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()


    log("Deploying Qi...")
    await deploy("Qi", {
        from: deployer,
        log: true,
        args: [],
        proxy: {
            proxyContract: "OpenZeppelinTransparentProxy",
            viaAdminContract: {
                name: "QiProxyAdmin",
                artifact: "QiProxyAdmin",
            },
        },
    })

    log("Qi Deployed!")
    log("----------------------------------")

}
export default deployQi
deployQi.tags = ["all", "qi", "contracts", "main"]
