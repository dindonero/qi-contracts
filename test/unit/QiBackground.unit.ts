import { developmentChains, qiBackgroundBaseURI } from "../../helper-hardhat-config"
import { deployments, ethers, network } from "hardhat"
import { QiBackground, VRFCoordinatorV2Mock } from "../../typechain-types"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { BigNumber } from "ethers"
import { assert, expect } from "chai"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Qi Background Unit Tests", async () => {
          let qiBackground: QiBackground
          let deployer: SignerWithAddress
          let alice: SignerWithAddress
          let price: BigNumber

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              alice = accounts[1]
              await deployments.fixture(["all"])
              const qiBackgroundProxy = await ethers.getContract("QiBackground_Proxy")
              qiBackground = await ethers.getContractAt("QiBackground", qiBackgroundProxy.address)
              price = await qiBackground.MINT_PRICE()
          })

          describe("Mint Background NFT", async () => {
              it("Should revert if not enough ETH is sent", async () => {
                  await expect(
                      qiBackground.mint({ value: price.sub(1) })
                  ).to.be.revertedWith("QiBackground__NotEnoughETHForMint")
              })

              it("Should mint a background", async () => {
                  const mintTx = await qiBackground.mint({ value: price })
                  const mintReceipt = await mintTx.wait(1)

                  const eventTopics = mintReceipt.events![4].topics

                  const tokenId = +eventTopics[2]

                  // Assert
                  assert.equal(await qiBackground.ownerOf(tokenId), deployer.address)
                  assert.equal(
                      await qiBackground.tokenURI(tokenId),
                      qiBackgroundBaseURI + tokenId.toString()
                  )
              })
          })
      })
