import {
    developmentChains,
    qiBaseURI,
    qiRoyaltiesFeeNumerator,
} from "../../../helper-hardhat-config"
import { deployments, ethers, network } from "hardhat"
import { Qi } from "../../../typechain-types"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { networkConfig } from "../../../helper-hardhat-config"
import { QiTreasury } from "../../../typechain-types"
import { QiVRFConsumer } from "../../../typechain-types/contracts/Qi"
import VRFConsumerConfigStruct = QiVRFConsumer.VRFConsumerConfigStruct

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Qi Correctness Tests", async () => {
          let qi: Qi
          let qiTreasury: QiTreasury
          let deployer: SignerWithAddress
          const price = ethers.utils.parseEther("0.1")
          const maxSupply = 8888
          const baseURI = qiBaseURI
          const chainId = network.config.chainId!

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["all"])
              const qiProxy = await ethers.getContract("Qi_Proxy")
              qi = await ethers.getContractAt("Qi", qiProxy.address)
              qiTreasury = await ethers.getContract("QiTreasury")
          })

          describe("Correctness", async () => {
              it("Should have the correct baseURI", async () => {
                  assert.equal(await qi.BASE_URI(), baseURI)
              })

              it("Should have the correct price", async () => {
                  assert.equal((await qi.MINT_PRICE()).toString(), price.toString())
              })

              it("Should have the correct maxSupply", async () => {
                  assert.equal(await qi.MAX_SUPPLY(), maxSupply)
              })

              it("Should have the correct gov address", async () => {
                  const teamMultisig = networkConfig[chainId].teamMultisig
                  assert.equal(await qi.gov(), teamMultisig)
              })

              it("Should have the correct treasury", async () => {
                  assert.equal(await qi.s_qiTreasury(), qiTreasury.address)
              })

              it("Should have the correct royalties", async () => {
                  const royaltyNumerator = qiRoyaltiesFeeNumerator
                  const salePrice = 10000
                  const royalty = (salePrice * +royaltyNumerator!) / 10000
                  const royaltyInfo = await qi.royaltyInfo(0, salePrice)
                  assert.equal(royaltyInfo[0], qiTreasury.address)
                  assert.equal(royaltyInfo[1], royalty)
              })

              it("Should revert if initialized again", async () => {
                  await expect(
                      qi.initialize(
                          "",
                          qiTreasury.address,
                          qiTreasury.address,
                          0,
                          qiTreasury.address
                      )
                  ).to.be.revertedWith("Qi__AlreadyInitialized")
              })
          })
      })
