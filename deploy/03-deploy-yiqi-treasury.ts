import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { networkConfig } from "../helper-hardhat-config"

const deployYiqiTreasury: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network, ethers } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId!

    const yiqi = await ethers.getContract("Yiqi_Proxy")
    const WETH = networkConfig[chainId].WETH!
    const stETH = networkConfig[chainId].stEth!
    const curveEthStEthPool = networkConfig[chainId].curveEthStEthPool!
    const yamGovernance = networkConfig[chainId].yamGovernance!
    const teamMultisig = networkConfig[chainId].teamMultisig!

    const args = [yiqi.address, stETH, WETH, curveEthStEthPool, yamGovernance, teamMultisig]

    log("Deploying YiqiTreasury...")
    await deploy("YiqiTreasury", {
        from: deployer,
        log: true,
        args: args,
    })

    log("YiqiTreasury Deployed!")
    log("----------------------------------")
}
export default deployYiqiTreasury
deployYiqiTreasury.tags = ["all", "contracts", "treasury", "main"]
