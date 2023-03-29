import { developmentChains, networkConfig, qiBaseURI } from "../../helper-hardhat-config"
import { deployments, ethers, network } from "hardhat"
import { Qi, VRFCoordinatorV2Mock } from "../../typechain-types"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { BigNumber } from "ethers"
import { assert, expect } from "chai"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Qi Unit Tests", async () => {
          let qi: Qi
          let deployer: SignerWithAddress
          let alice: SignerWithAddress
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
          let price: BigNumber
          const category = 1

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              alice = accounts[1]
              await deployments.fixture(["all"])
              const qiProxy = await ethers.getContract("Qi_Proxy")
              qi = await ethers.getContractAt("Qi", qiProxy.address)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              price = await qi.MINT_PRICE()
          })

          describe("Mint NFT", async () => {
              it("Should revert if not enough ETH is sent", async () => {
                  await expect(
                      qi.requestMint(category, { value: price.sub(1) })
                  ).to.be.revertedWith("Qi__NotEnoughETHForMint")
              })

              it("Should revert if non-existing category is sent", async () => {
                  await expect(qi.requestMint(100, { value: price })).to.be.reverted
              })

              it("Should revert if calling fulfillRandomWords without being the VRF Coordinator", async () => {
                  const requestTx = await qi.requestMint(category, { value: price })
                  const requestReceipt = await requestTx.wait(1)
                  const requestId = requestReceipt.events![5].args!.requestId

                  await expect(qi.rawFulfillRandomWords(requestId, [1, 2, 3])).to.be.revertedWith(
                      "OnlyCoordinatorCanFulfill"
                  )
              })

              it("Should request an NFT", async () => {
                  const requestTx = await qi.requestMint(category, { value: price })
                  const requestReceipt = await requestTx.wait(1)
                  const requestId = requestReceipt.events![5].args!.requestId

                  const request = await qi.s_requestIdToRandomNFTRequest(requestId)

                  // Assert
                  assert.equal(requestReceipt.events![5].args!.category, category)
                  assert.equal(requestReceipt.events![5].args!.owner, deployer.address)
                  assert.equal(requestReceipt.events![5].args!.tokenId, request.tokenId.toString())
                  assert.equal(request.category.toString(), category.toString())
              })

              it("Should mint a Qi", async () => {
                  const requestTx = await qi.requestMint(category, { value: price })
                  const requestReceipt = await requestTx.wait(1)
                  const requestId = requestReceipt.events![5].args!.requestId

                  const fulfillTx = await vrfCoordinatorV2Mock.fulfillRandomWords(
                      requestId,
                      qi.address
                  )
                  const fulfillReceipt = await fulfillTx.wait(1)

                  const eventData = ethers.utils.defaultAbiCoder.decode(
                      ["uint256", "uint256", "uint256"],
                      fulfillReceipt.events![2].data
                  )

                  const tokenId = +fulfillReceipt.events![2].topics[3]
                  const backgroundTokenId = eventData[2]
                  const animalVersionId = eventData[1]
                  const qiNFT = await qi.s_tokenIdToQiNFT(tokenId)

                  // Assert
                  assert.equal(await qi.ownerOf(tokenId), deployer.address)
                  assert.equal(await qi.tokenURI(tokenId), qiBaseURI + tokenId.toString())
                  assert.equal(qiNFT.category, category)
                  assert.equal(qiNFT.animalVersionId.toString(), animalVersionId)
                  assert.equal(qiNFT.backgroundId.toString(), backgroundTokenId)
              })
          })

          describe("Burn NFT", async () => {
              let tokenId: number
              beforeEach(async () => {
                  const requestTx = await qi.requestMint(category, { value: price })
                  const requestReceipt = await requestTx.wait(1)
                  const requestId = requestReceipt.events![5].args!.requestId

                  const fulfillTx = await vrfCoordinatorV2Mock.fulfillRandomWords(
                      requestId,
                      qi.address
                  )
                  const fulfillReceipt = await fulfillTx.wait(1)

                  tokenId = +fulfillReceipt.events![2].topics[3]
              })

              it("Should revert if not owner tries to burn", async () => {
                  await expect(qi.connect(alice).burn(tokenId)).to.be.revertedWith(
                      "ERC721__CallerIsNotOwnerOrApproved"
                  )
              })

              it("Should burn NFT", async () => {
                  const balanceBefore = await deployer.getBalance()

                  const burnTx = await qi.burn(tokenId)
                  const burnReceipt = await burnTx.wait(1)

                  const balanceAfter = await deployer.getBalance()

                  // Assert Transfer event
                  assert.equal(burnReceipt.events![0].event, "Transfer")
                  assert.equal(burnReceipt.events![0].args!.from, deployer.address)
                  assert.equal(burnReceipt.events![0].args!.to, ethers.constants.AddressZero)
                  assert.equal(burnReceipt.events![0].args!.tokenId, tokenId)

                  // Assert Burn event [8]
                  assert.isTrue(balanceAfter.sub(balanceBefore).gte(price.mul(90).div(100))) // verify if burning gets at least 90% of the ETH back
                  assert.equal((await qi.balanceOf(deployer.address)).toNumber(), 0)
                  await expect(qi.tokenURI(tokenId)).to.be.revertedWith("ERC721: invalid token ID")
              })
          })
      })
