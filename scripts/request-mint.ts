import {ethers} from "hardhat"

const requestMint = async () => {
    const yiqiProxy = await ethers.getContract("Yiqi_Proxy")
    const yiqi = await ethers.getContractAt("Yiqi", yiqiProxy.address)

    console.log("Requesting mint...")

    const tx = await yiqi.requestMint(1, {value: ethers.utils.parseEther("0.1")})

    const receipt = await tx.wait(1)

    console.log("Mint requested. Tx hash: " + receipt.transactionHash)
}

requestMint()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
