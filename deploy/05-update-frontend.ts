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
    const yiqi = await ethers.getContract("Yiqi")
    fs.writeFileSync(
        `${frontEndAbiLocation}Yiqi.json`,
        yiqi.interface.format(ethers.utils.FormatTypes.json).toString()
    )

    const yiqiBackground = await ethers.getContract("YiqiBackground")
    fs.writeFileSync(
        `${frontEndAbiLocation}YiqiBackground.json`,
        yiqiBackground.interface.format(ethers.utils.FormatTypes.json).toString()
    )

    // might be unnecessary
    const yiqiTreasury = await ethers.getContract("YiqiTreasury")
    fs.writeFileSync(
        `${frontEndAbiLocation}YiqiTreasury.json`,
        yiqiTreasury.interface.format(ethers.utils.FormatTypes.json).toString()
    )
}

const updateContractAddresses = async () => {
    const chainId = network.config.chainId!.toString()
    const yiqi = await ethers.getContract("Yiqi_Proxy")
    const yiqiBackground = await ethers.getContract("YiqiBackground_Proxy")
    const yiqiTreasury = await ethers.getContract("YiqiTreasury")

    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))

    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId]["Yiqi"].includes(yiqi.address)) {
            contractAddresses[chainId]["Yiqi"].push(yiqi.address)
            contractAddresses[chainId]["YiqiBackground"].push(yiqiBackground.address)
            contractAddresses[chainId]["YiqiTreasury"].push(yiqiTreasury.address)
        }
    } else {
        contractAddresses[chainId] = {
            Yiqi: [yiqi.address],
            YiqiBackground: [yiqiBackground.address],
            YiqiTreasury: [yiqiTreasury.address],
        }
    }

    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
}

export default updateFrontEnd
updateFrontEnd.tags = ["all", "main", "frontend"]
