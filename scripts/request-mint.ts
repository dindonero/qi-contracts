import { ethers, network } from "hardhat";

const requestMint = async () => {
    const qiProxy = await ethers.getContract("Qi_Proxy");
    const qi = await ethers.getContractAt("Qi", qiProxy.address);

    console.log("Requesting mint...");
    
    const tx = await qi.requestMint(1, { value: ethers.utils.parseEther("0.1") });

    const receipt = await tx.wait(1);

    console.log("Mint requested. Tx hash: " + receipt.transactionHash)
}

requestMint().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});