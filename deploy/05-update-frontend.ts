import { frontEndContractsFile, frontEndAbiLocation } from "../helper-hardhat-config"
import fs from "fs"
import { network, ethers } from "hardhat"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const updateFrontEnd: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Writing to front end...")
        await updateContractAddresses()
        await updateAbi()
        console.log("Front end written!")
    }
}

const updateAbi = async () => {
    const qi = await ethers.getContract("Qi")
    fs.writeFileSync(
        `${frontEndAbiLocation}Qi.json`,
        qi.interface.format(ethers.utils.FormatTypes.json).toString()
    )

    const qiBackground = await ethers.getContract("QiBackground")
    fs.writeFileSync(
        `${frontEndAbiLocation}QiBackground.json`,
        qiBackground.interface.format(ethers.utils.FormatTypes.json).toString()
    )

    // might be unnecessary
    const qiTreasury = await ethers.getContract("QiTreasury")
    fs.writeFileSync(
        `${frontEndAbiLocation}QiTreasury.json`,
        qiTreasury.interface.format(ethers.utils.FormatTypes.json).toString()
    )
}

const updateContractAddresses = async () => {
    const chainId = network.config.chainId!.toString()
    const qi = await ethers.getContract("Qi_Proxy")
    const qiBackground = await ethers.getContract("QiBackground_Proxy")
    const qiTreasury = await ethers.getContract("QiTreasury")

    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))

    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId]["Qi"].includes(qi.address)) {
            contractAddresses[chainId]["Qi"].push(qi.address)
            contractAddresses[chainId]["QiBackground"].push(qiBackground.address)
            contractAddresses[chainId]["QiTreasury"].push(qiTreasury.address)
        }
    } else {
        contractAddresses[chainId] = {
            Qi: [qi.address],
            QiBackground: [qiBackground.address],
            QiTreasury: [qiTreasury.address],
        }
    }

    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
}

export default updateFrontEnd
updateFrontEnd.tags = ["all", "main", "frontend"]
