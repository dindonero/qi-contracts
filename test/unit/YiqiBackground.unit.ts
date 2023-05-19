import {developmentChains, yiqiBackgroundBaseURI} from "../../helper-hardhat-config"
import {deployments, ethers, network} from "hardhat"
import {YiqiBackground} from "../../typechain-types"
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers"
import {BigNumber} from "ethers"
import {assert, expect} from "chai"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Yiqi Background Unit Tests", async () => {
        let yiqiBackground: YiqiBackground
        let deployer: SignerWithAddress
        let alice: SignerWithAddress
        let price: BigNumber

        beforeEach(async () => {
            const accounts = await ethers.getSigners()
            deployer = accounts[0]
            alice = accounts[1]
            await deployments.fixture(["all"])
            const yiqiBackgroundProxy = await ethers.getContract("YiqiBackground_Proxy")
            yiqiBackground = await ethers.getContractAt("YiqiBackground", yiqiBackgroundProxy.address)
            price = await yiqiBackground.MINT_PRICE()
        })

        describe("Mint Background NFT", async () => {
            it("Should revert if not enough ETH is sent", async () => {
                await expect(yiqiBackground.mint({value: price.sub(1)})).to.be.revertedWith(
                    "YiqiBackground__NotEnoughETHForMint"
                )
            })

            it("Should mint a background", async () => {
                const mintTx = await yiqiBackground.mint({value: price})
                const mintReceipt = await mintTx.wait(1)

                const eventTopics = mintReceipt.events![4].topics

                const tokenId = +eventTopics[2]

                // Assert
                assert.equal(await yiqiBackground.ownerOf(tokenId), deployer.address)
                assert.equal(
                    await yiqiBackground.tokenURI(tokenId),
                    yiqiBackgroundBaseURI + tokenId.toString()
                )
            })
        })
    })
