import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { networkConfig } from "../helper-hardhat-config"

const deployQiTreasury: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network, ethers } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId!

    const qi = await ethers.getContract("Qi_Proxy")
    const WETH = networkConfig[chainId].WETH!
    const stETH = networkConfig[chainId].stEth!
    const curveEthStEthPool = networkConfig[chainId].curveEthStEthPool!
    const yamGovernance = networkConfig[chainId].yamGovernance!
    const teamMultisig = networkConfig[chainId].teamMultisig!

    const args = [qi.address, stETH, WETH, curveEthStEthPool, yamGovernance, teamMultisig]

    log("Deploying QiTreasury...")
    await deploy("QiTreasury", {
        from: deployer,
        log: true,
        args: args,
    })

    log("QiTreasury Deployed!")
    log("----------------------------------")
}
export default deployQiTreasury
deployQiTreasury.tags = ["all", "contracts", "treasury", "main"]
