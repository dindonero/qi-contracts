import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { networkConfig } from "../helper-hardhat-config"

const deployQiBackground: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network, ethers } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId!

    const qi = await ethers.getContract("Qi_Proxy")
    const wstETH = networkConfig[chainId].wstETH
    const WETH = networkConfig[chainId].WETH
    const DAI = networkConfig[chainId].DAI
    const swapRouter = networkConfig[chainId].swapRouter
    const yamGovernance = networkConfig[chainId].yamGovernance
    const teamMultisig = networkConfig[chainId].teamMultisig

    const args = [qi.address, wstETH, WETH, DAI, swapRouter, yamGovernance, teamMultisig]

    log("Deploying QiTreasury...")
    await deploy("QiTreasury", {
        from: deployer,
        log: true,
        args: args,
    })

    log("QiTreasury Deployed!")
    log("----------------------------------")
}
export default deployQiBackground
deployQiBackground.tags = ["all", "contracts", "main"]
