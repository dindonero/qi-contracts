import {
    developmentChains,
    qiBackgroundBaseURI,
    qiBaseURI,
    qiRoyaltiesFeeNumerator
} from "../../../helper-hardhat-config";
import {deployments, ethers, network} from "hardhat";
import {Qi, QiBackground} from "../../../typechain-types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {assert, expect} from "chai";
import {networkConfig} from "../../../helper-hardhat-config";
import {QiTreasury} from "../../../typechain-types";
import {QiVRFConsumer} from "../../../typechain-types/contracts/Qi";
import VRFConsumerConfigStruct = QiVRFConsumer.VRFConsumerConfigStruct;


!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Qi Background Correctness Tests", async () => {
        let qiBackground: QiBackground
    let qiTreasury: QiTreasury
        let deployer: SignerWithAddress
        const price = ethers.utils.parseEther("0.01")
        const maxSupply = 10000
        const baseURI = qiBackgroundBaseURI
        const chainId = network.config.chainId!

        beforeEach(async () => {
            const accounts = await ethers.getSigners()
            deployer = accounts[0]
            await deployments.fixture(["all"])
            const qiBackgroundProxy = await ethers.getContract("QiBackground_Proxy")
            qiBackground = await ethers.getContractAt("QiBackground", qiBackgroundProxy.address)
            qiTreasury = await ethers.getContract("QiTreasury")
        })

        describe("Correctness", async () => {
            it("Should have the correct baseURI", async () => {
                assert.equal(await qiBackground.BASE_URI(), baseURI)
            })

            it("Should have the correct price", async () => {
                assert.equal((await qiBackground.MINT_PRICE()).toString(), price.toString())
            })

            it("Should have the correct maxSupply", async () => {
                assert.equal(await qiBackground.MAX_SUPPLY(), maxSupply)
            })

            it("Should have the correct treasury", async () => {
                assert.equal(await qiBackground.s_qiTreasury(), qiTreasury.address)
            })

            it("Should have the correct royalties", async () => {
                const royaltyNumerator = qiRoyaltiesFeeNumerator
                const salePrice = 10000
                const royalty = salePrice * +royaltyNumerator! / 10000
                const royaltyInfo = await qiBackground.royaltyInfo(0, salePrice)
                assert.equal(royaltyInfo[0], qiTreasury.address)
                assert.equal(royaltyInfo[1], royalty)
            })

            it("Should revert if initialized again", async () => {
                const fakeVrfConfig: VRFConsumerConfigStruct = {
                    vrfConsumerBase: qiTreasury.address,
                    subscriptionId: 0,
                    gasLane: networkConfig[chainId].gasLane!,
                    callbackGasLimit: 0,
                }
                await expect(qiBackground.initialize(
                    fakeVrfConfig,
                    "",
                    qiTreasury.address,
                    qiTreasury.address,
                    0,
                    qiTreasury.address,
                )).to.be.revertedWith("QiBackground: Contract instance has already been initialized")
            })
        })
    })
