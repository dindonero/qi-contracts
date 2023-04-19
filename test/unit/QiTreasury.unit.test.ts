import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { deployments, ethers, network } from "hardhat"
import { expect, assert } from "chai"
import { IERC20, Qi, QiBackground, QiTreasury } from "../../typechain-types"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Qi Treasury Unit Tests", async () => {
          let qiTreasury: QiTreasury
          let qiBackground: QiBackground
          let qi: Qi
          let deployer: SignerWithAddress
          let alice: SignerWithAddress
          let yamGov: string
          let wstETH: IERC20

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              alice = accounts[1]
              await deployments.fixture(["all"])
              qiTreasury = await ethers.getContract("QiTreasury")
              const qiBackgroundProxy = await ethers.getContract("QiBackground_Proxy")
              qiBackground = await ethers.getContractAt("QiBackground", qiBackgroundProxy.address)
              const qiProxy = await ethers.getContract("Qi_Proxy")
              qi = await ethers.getContractAt("Qi", qiProxy.address)
              yamGov = networkConfig[network.config!.chainId!].yamGovernance!
              wstETH = await ethers.getContractAt(
                  "IERC20",
                  networkConfig[network.config!.chainId!].wstETH!
              )
          })

          describe("Restricted Functions", async () => {
              it("Only Qi can call depositETHFromMint", async () => {
                  await expect(qiTreasury.depositETHFromMint({ value: 1 })).to.be.revertedWith(
                      "QiTreasury: Only Qi can call this function"
                  )
              })

              it("Only Qi can call withdrawByQiBurned", async () => {
                  await expect(qiTreasury.withdrawByQiBurned(deployer.address)).to.be.revertedWith(
                      "QiTreasury: Only Qi can call this function"
                  )
              })

              it("Only gov can call setQi", async () => {
                  await expect(
                      qiTreasury.connect(alice).setQi(deployer.address)
                  ).to.be.revertedWith("Governable: forbidden")
                  const tx = await qiTreasury.connect(deployer).setQi(deployer.address) //deployer.address is the local mock of yamGovernance
                  await tx.wait(1)
                  assert.equal(await qiTreasury.s_qi(), deployer.address)
              })

              it("Only gov can set teamMultisig", async () => {
                  await expect(
                      qiTreasury.connect(alice).setTeamMultisig(deployer.address)
                  ).to.be.revertedWith("Governable: forbidden")
              })

              it("Only gov can remove liquidity", async () => {
                  await expect(
                      qiTreasury.connect(alice).removeLiquidity(1, deployer.address)
                  ).to.be.revertedWith("Governable: forbidden")
              })
          })

          describe("Qi functions", async () => {
              it("Minting a Qi NFT should deposit wstETH into QiTreasury", async () => {
                  const wstETHBalanceBefore = await wstETH.balanceOf(qiTreasury.address)
                  const numNFTsBefore = await qiTreasury.s_numOutstandingNFTs()

                  await qi.requestMint(1, { value: await qi.MINT_PRICE() })
                  assert.isTrue(
                      (await wstETH.balanceOf(qiTreasury.address)).gt(wstETHBalanceBefore)
                  )
                  assert.equal(
                      (await qiTreasury.s_numOutstandingNFTs()).toString(),
                      numNFTsBefore.add(1).toString()
                  )
              })

              it("Should withdraw team fee only every 6 months", async () => {
                  await qi.requestMint(1, {
                      value: (await qi.MINT_PRICE()).add("1000000000000000000000"),
                  })

                  const teamMultisig = networkConfig[network.config!.chainId!].teamMultisig!
                  const yamGov = networkConfig[network.config!.chainId!].yamGovernance!

                  const teamMultisigBalanceBefore = await ethers.provider.getBalance(teamMultisig)
                  const yamGovBalanceBefore = await ethers.provider.getBalance(yamGov)

                  await expect(qiTreasury.withdrawTeamAndTreasuryFee()).to.be.revertedWith(
                      "QiTreasury: Can only withdraw every 6 months"
                  )

                  // Advance time by 6 months
                  await network.provider.send("evm_increaseTime", [60 * 60 * 24 * 30 * 6])

                  const tx = await qiTreasury.withdrawTeamAndTreasuryFee()
                  await tx.wait(1)

                  assert.isTrue(
                      (await ethers.provider.getBalance(teamMultisig)).gt(teamMultisigBalanceBefore)
                  )
                  assert.isTrue((await ethers.provider.getBalance(yamGov)).gt(yamGovBalanceBefore))

                  await expect(qiTreasury.withdrawTeamAndTreasuryFee()).to.be.revertedWith(
                      "QiTreasury: Can only withdraw every 6 months"
                  )
              })
          })
      })
