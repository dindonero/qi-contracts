import { developmentChains, qiBaseURI } from "../../helper-hardhat-config"
import { deployments, ethers, network } from "hardhat"
import { Qi, VRFCoordinatorV2Mock } from "../../typechain-types"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { BigNumber } from "ethers"
import { assert } from "chai"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Qi Unit Tests", async () => {
          let qi: Qi
          let deployer: SignerWithAddress
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
          let price: BigNumber
          const category = 1

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["all"])
              const qiProxy = await ethers.getContract("Qi_Proxy")
              qi = await ethers.getContractAt("Qi", qiProxy.address)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              price = await qi.MINT_PRICE()
          })
          describe("Mint", async () => {
              it("Should mint a Qi", async () => {
                  const requestTx = await qi.requestMint(category, { value: price })
                  const requestReceipt = await requestTx.wait(1)
                  const requestId = requestReceipt.events![1].args!.requestId

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
      })
