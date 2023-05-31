import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { deployments, ethers, network } from "hardhat"
import { expect, assert } from "chai"
import { IERC20, Yiqi, YiqiBackground, YiqiTreasury } from "../../typechain-types"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Yiqi Treasury Unit Tests", async () => {
          let yiqiTreasury: YiqiTreasury
          let yiqiBackground: YiqiBackground
          let yiqi: Yiqi
          let deployer: SignerWithAddress
          let alice: SignerWithAddress
          let stETH: IERC20

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              alice = accounts[1]
              await deployments.fixture(["all"])
              yiqiTreasury = await ethers.getContract("YiqiTreasury")
              const yiqiBackgroundProxy = await ethers.getContract("YiqiBackground_Proxy")
              yiqiBackground = await ethers.getContractAt("YiqiBackground", yiqiBackgroundProxy.address)
              const yiqiProxy = await ethers.getContract("Yiqi_Proxy")
              yiqi = await ethers.getContractAt("Yiqi", yiqiProxy.address)
              stETH = await ethers.getContractAt(
                  "IERC20",
                  networkConfig[network.config!.chainId!].stEth!
              )
          })

          describe("Restricted Functions", async () => {
              it("Only Yiqi can call depositETHFromMint", async () => {
                  await expect(yiqiTreasury.depositETHFromMint({ value: 1 })).to.be.revertedWith(
                      "YiqiTreasury: Only Yiqi can call this function"
                  )
              })

              it("Only Yiqi can call withdrawByYiqiBurned", async () => {
                  await expect(yiqiTreasury.withdrawByYiqiBurned(deployer.address, 0)).to.be.revertedWith(
                      "YiqiTreasury: Only Yiqi can call this function"
                  )
              })

              it("Only gov can call setYiqi", async () => {
                  await expect(
                      yiqiTreasury.connect(alice).setYiqi(deployer.address)
                  ).to.be.revertedWith("Governable: forbidden")
                  const tx = await yiqiTreasury.connect(deployer).setYiqi(deployer.address) //deployer.address is the local mock of yamGovernance
                  await tx.wait(1)
              })

              it("Only gov can set teamMultisig", async () => {
                  await expect(
                      yiqiTreasury.connect(alice).setTeamMultisig(deployer.address)
                  ).to.be.revertedWith("Governable: forbidden")
              })

              it("Only gov can remove liquidity", async () => {
                  await expect(
                      yiqiTreasury.connect(alice).removeLiquidity(deployer.address)
                  ).to.be.revertedWith("Governable: forbidden")
              })
          })

          describe("Yiqi functions", async () => {
              it("Minting a Yiqi NFT should deposit stETH into YiqiTreasury", async () => {
                  const stETHBalanceBefore = await stETH.balanceOf(yiqiTreasury.address)
                  const numNFTsBefore = await yiqiTreasury.getNumOutstandingNFTs()

                  await yiqi.mint({ value: await yiqi.MINT_PRICE() })
                  assert.isTrue((await stETH.balanceOf(yiqiTreasury.address)).gt(stETHBalanceBefore))
                  assert.equal(
                      (await yiqiTreasury.getNumOutstandingNFTs()).toString(),
                      numNFTsBefore.add(1).toString()
                  )
              })

              it("Should withdraw team fee only every 6 months", async () => {
                  await yiqi.mint({
                      value: (await yiqi.MINT_PRICE()).add("1000000000000000000000"),
                  })

                  const WETH: IERC20 = await ethers.getContractAt(
                      "IERC20",
                      networkConfig[network.config!.chainId!].WETH!
                  )

                  const teamMultisig = networkConfig[network.config!.chainId!].teamMultisig!
                  const yamReserves = networkConfig[network.config!.chainId!].yamReserves!

                  const teamMultisigBalanceBefore = await WETH.balanceOf(teamMultisig)
                  const yamGovBalanceBefore = await WETH.balanceOf(yamReserves)

                  await expect(yiqiTreasury.withdrawTeamAndTreasuryFee(0)).to.be.revertedWith(
                      "YiqiTreasury: Can only withdraw every 6 months"
                  )

                  // Advance time by 6 months
                  await network.provider.send("evm_increaseTime", [60 * 60 * 24 * 30 * 6])

                  const tx = await yiqiTreasury.withdrawTeamAndTreasuryFee(0)
                  await tx.wait(1)

                  assert.isTrue((await WETH.balanceOf(teamMultisig)).gt(teamMultisigBalanceBefore))
                  assert.isTrue((await WETH.balanceOf(yamReserves)).gt(yamGovBalanceBefore))

                  await expect(yiqiTreasury.withdrawTeamAndTreasuryFee(0)).to.be.revertedWith(
                      "YiqiTreasury: Can only withdraw every 6 months"
                  )
              })
          })
      })
