import {developmentChains, networkConfig, yiqiRoyaltiesFeeNumerator} from "../../../helper-hardhat-config"
import {deployments, ethers, network} from "hardhat"
import {Yiqi, YiqiTreasury} from "../../../typechain-types"
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers"
import {assert, expect} from "chai"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Yiqi Correctness Tests", async () => {
        let yiqi: Yiqi
        let yiqiTreasury: YiqiTreasury
        let deployer: SignerWithAddress
        const price = ethers.utils.parseEther("0.1")
        const maxSupply = 8888
        const chainId = network.config.chainId!

        beforeEach(async () => {
            const accounts = await ethers.getSigners()
            deployer = accounts[0]
            await deployments.fixture(["all"])
            const yiqiProxy = await ethers.getContract("Yiqi_Proxy")
            yiqi = await ethers.getContractAt("Yiqi", yiqiProxy.address)
            yiqiTreasury = await ethers.getContract("YiqiTreasury")
        })

        describe("Correctness", async () => {
            it("Should have the correct price", async () => {
                assert.equal((await yiqi.MINT_PRICE()).toString(), price.toString())
            })

            it("Should have the correct maxSupply", async () => {
                assert.equal(await yiqi.MAX_SUPPLY(), maxSupply)
            })

            it("Should have the correct gov address", async () => {
                const teamMultisig = networkConfig[chainId].teamMultisig
                assert.equal(await yiqi.gov(), teamMultisig)
            })

            it("Should have the correct royalties", async () => {
                const royaltyNumerator = yiqiRoyaltiesFeeNumerator
                const salePrice = 10000
                const royalty = (salePrice * +royaltyNumerator!) / 10000
                const royaltyInfo = await yiqi.royaltyInfo(0, salePrice)
                assert.equal(royaltyInfo[0], yiqiTreasury.address)
                assert.equal(royaltyInfo[1], royalty)
            })

            it("Should revert if initialized again", async () => {
                await expect(
                    yiqi.initialize(
                        ethers.constants.AddressZero,
                        ethers.constants.AddressZero,
                        '',
                        0,
                        ethers.constants.AddressZero
                    )
                ).to.be.revertedWith("Yiqi__AlreadyInitialized")
            })
        })
    })
