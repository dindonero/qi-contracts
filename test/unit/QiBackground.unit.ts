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
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
          let price: BigNumber
          const category = 1

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              alice = accounts[1]
              await deployments.fixture(["all"])
              const qiBackgroundProxy = await ethers.getContract("QiBackground_Proxy")
              qiBackground = await ethers.getContractAt("QiBackground", qiBackgroundProxy.address)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              price = await qiBackground.MINT_PRICE()
          })

          describe("Mint Background NFT", async () => {
              it("Should revert if not enough ETH is sent", async () => {
                  await expect(
                      qiBackground.requestMint(category, { value: price.sub(1) })
                  ).to.be.revertedWith("QiBackground__NotEnoughETHForMint")
              })

              it("Should revert if non-existing category is sent", async () => {
                  await expect(qiBackground.requestMint(100, { value: price })).to.be.reverted
              })

              it("Should revert if calling fulfillRandomWords without being the VRF Coordinator", async () => {
                  const requestTx = await qiBackground.requestMint(category, { value: price })
                  const requestReceipt = await requestTx.wait(1)
                  const requestId = requestReceipt.events![5].args!.requestId

                  await expect(
                      qiBackground.rawFulfillRandomWords(requestId, [1, 2, 3])
                  ).to.be.revertedWith("OnlyCoordinatorCanFulfill")
              })

              it("Should request a background", async () => {
                  const requestTx = await qiBackground.requestMint(category, { value: price })
                  const requestReceipt = await requestTx.wait(1)
                  const requestId = requestReceipt.events![5].args!.requestId

                  const request = await qiBackground.s_requestIdToRandomBackgroundRequest(requestId)

                  // Assert
                  assert.equal(requestReceipt.events![5].args!.category, category)
                  assert.equal(requestReceipt.events![5].args!.owner, deployer.address)
                  assert.equal(requestReceipt.events![5].args!.tokenId, request.tokenId.toString())
                  assert.equal(request.category.toString(), category.toString())
              })

              it("Should mint a background", async () => {
                  const requestTx = await qiBackground.requestMint(category, { value: price })
                  const requestReceipt = await requestTx.wait(1)
                  const requestId = requestReceipt.events![5].args!.requestId

                  const fulfillTx = await vrfCoordinatorV2Mock.fulfillRandomWords(
                      requestId,
                      qiBackground.address
                  )
                  const fulfillReceipt = await fulfillTx.wait(1)

                  const eventData = ethers.utils.defaultAbiCoder.decode(
                      ["uint256", "uint256"],
                      fulfillReceipt.events![1].data
                  )

                  const tokenId = +fulfillReceipt.events![1].topics[3]
                  const backgroundVersionId = eventData[1]
                  const qiNFT = await qiBackground.s_tokenIdToQiBackground(tokenId)

                  // Assert
                  assert.equal(await qiBackground.ownerOf(tokenId), deployer.address)
                  assert.equal(
                      await qiBackground.tokenURI(tokenId),
                      qiBackgroundBaseURI + tokenId.toString()
                  )
                  assert.equal(qiNFT.category, category)
                  assert.equal(qiNFT.versionId.toString(), backgroundVersionId)
              })
          })
      })
