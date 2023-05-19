import { developmentChains, yiqiBaseURI } from "../../helper-hardhat-config"
import { deployments, ethers, network } from "hardhat"
import { Yiqi } from "../../typechain-types"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { BigNumber } from "ethers"
import { assert, expect } from "chai"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Yiqi Unit Tests", async () => {
          let yiqi: Yiqi
          let deployer: SignerWithAddress
          let alice: SignerWithAddress
          let price: BigNumber

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              alice = accounts[1]
              await deployments.fixture(["all"])
              const yiqiProxy = await ethers.getContract("Yiqi_Proxy")
              yiqi = await ethers.getContractAt("Yiqi", yiqiProxy.address)
              price = await yiqi.MINT_PRICE()
          })

          describe("Mint NFT", async () => {
              it("Should revert if not enough ETH is sent", async () => {
                  await expect(yiqi.mint({ value: price.sub(1) })).to.be.revertedWith(
                      "Yiqi__NotEnoughETHForMint"
                  )
              })

              it("Should mint a Yiqi", async () => {
                  const mintTx = await yiqi.mint({ value: price })
                  const mintReceipt = await mintTx.wait(1)

                  const eventTopics = mintReceipt.events![6].topics

                  const tokenId = +eventTopics[2]
                  const backgroundTokenId = +eventTopics[3]
                  const yiqiNFT = await yiqi.getBackgroundFromTokenId(tokenId)

                  // Assert
                  assert.equal(await yiqi.ownerOf(tokenId), deployer.address)
                  assert.equal(await yiqi.tokenURI(tokenId), yiqiBaseURI + tokenId.toString())
                  assert.equal(yiqiNFT, backgroundTokenId)
              })
          })

          describe("Burn NFT", async () => {
              let tokenId: number
              beforeEach(async () => {
                  const mintTx = await yiqi.mint({ value: price })
                  const mintReceipt = await mintTx.wait(1)

                  tokenId = +mintReceipt.events![6].topics[2]
              })

              it("Should revert if not owner tries to burn", async () => {
                  await expect(yiqi.connect(alice).burn(tokenId)).to.be.revertedWith(
                      "ERC721__CallerIsNotOwnerOrApproved"
                  )
              })

              it("Should burn NFT", async () => {
                  const balanceBefore = await deployer.getBalance()

                  const burnTx = await yiqi.burn(tokenId)
                  const burnReceipt = await burnTx.wait(1)

                  const balanceAfter = await deployer.getBalance()

                  // Assert Transfer event
                  assert.equal(burnReceipt.events![0].event, "Transfer")
                  assert.equal(burnReceipt.events![0].args!.from, deployer.address)
                  assert.equal(burnReceipt.events![0].args!.to, ethers.constants.AddressZero)
                  assert.equal(burnReceipt.events![0].args!.tokenId, tokenId)

                  // Assert Burn event [8]
                  assert.isTrue(balanceAfter.sub(balanceBefore).gte(price.mul(90).div(100))) // verify if burning gets at least 90% of the ETH back
                  assert.equal((await yiqi.balanceOf(deployer.address)).toNumber(), 0)
                  await expect(yiqi.tokenURI(tokenId)).to.be.revertedWith("ERC721: invalid token ID")
              })
          })
      })
