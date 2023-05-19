import {developmentChains, yiqiRoyaltiesFeeNumerator,} from "../../../helper-hardhat-config"
import {deployments, ethers, network} from "hardhat"
import {YiqiBackground, YiqiTreasury} from "../../../typechain-types"
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers"
import {assert, expect} from "chai"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Yiqi Background Correctness Tests", async () => {
        let yiqiBackground: YiqiBackground
        let yiqiTreasury: YiqiTreasury
        let deployer: SignerWithAddress
        const price = ethers.utils.parseEther("0.01")

        beforeEach(async () => {
            const accounts = await ethers.getSigners()
            deployer = accounts[0]
            await deployments.fixture(["all"])
            const yiqiBackgroundProxy = await ethers.getContract("YiqiBackground_Proxy")
            yiqiBackground = await ethers.getContractAt("YiqiBackground", yiqiBackgroundProxy.address)
            yiqiTreasury = await ethers.getContract("YiqiTreasury")
        })

        describe("Correctness", async () => {
            it("Should have the correct price", async () => {
                assert.equal((await yiqiBackground.MINT_PRICE()).toString(), price.toString())
            })

            it("Should have the correct royalties", async () => {
                const royaltyNumerator = yiqiRoyaltiesFeeNumerator
                const salePrice = 10000
                const royalty = (salePrice * +royaltyNumerator!) / 10000
                const royaltyInfo = await yiqiBackground.royaltyInfo(0, salePrice)
                assert.equal(royaltyInfo[0], yiqiTreasury.address)
                assert.equal(royaltyInfo[1], royalty)
            })

            it("Should revert if initialized again", async () => {
                await expect(
                    yiqiBackground.initialize(ethers.constants.AddressZero,'',0)
                ).to.be.revertedWith("YiqiBackground__AlreadyInitialized")
            })
        })
    })
