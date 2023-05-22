import {developmentChains} from "../../../helper-hardhat-config"
import {deployments, ethers, network} from "hardhat"
import {
    ProxyAdmin,
    TransparentUpgradeableProxy,
    Yiqi,
    YiqiBackground,
    YiqiBackground__factory
} from "../../../typechain-types"
import {deployContract} from "ethereum-waffle";

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Upgrading tests", function () {
        let yiqi: Yiqi,
            yiqiProxy: TransparentUpgradeableProxy,
            yiqiBackground: YiqiBackground,
            yiqiBackgroundProxy: TransparentUpgradeableProxy,
            yiqiProxyAdmin: ProxyAdmin,
            yiqiBackgroundProxyAdmin: ProxyAdmin
        beforeEach(async () => {
            await deployments.fixture(["all"])
            yiqiProxy = await ethers.getContract("Yiqi_Proxy")
            yiqi = await ethers.getContractAt("Yiqi", yiqiProxy.address)
            yiqiBackgroundProxy = await ethers.getContract("YiqiBackground_Proxy")
            yiqiBackground = await ethers.getContractAt("YiqiBackground", yiqiProxy.address)
            yiqiProxyAdmin = await ethers.getContract("YiqiProxyAdmin")
            yiqiBackgroundProxyAdmin = await ethers.getContract("YiqiBackgroundProxyAdmin")
        })
        it("can deploy and upgrade yiqi", async function () {
            await deployments.fixture(["yiqi"])
            const newYiqi = await ethers.getContract("Yiqi_Implementation")
            // Tests if the proxy upgrade doesn't fail
            const upgradeTx = await yiqiProxyAdmin.upgrade(yiqiProxy.address, newYiqi.address)
            await upgradeTx.wait(1)
        })
        it("can deploy and upgrade yiqiBackground", async function () {

            const factory = new ethers.ContractFactory(YiqiBackground__factory.abi, YiqiBackground__factory.bytecode, (await ethers.getSigners())[0])
            const newYiqiBackground = await factory.deploy(yiqi.address)

            // Tests if the proxy upgrade doesn't fail
            const upgradeTx = await yiqiBackgroundProxyAdmin.upgrade(
                yiqiBackgroundProxy.address,
                newYiqiBackground.address
            )
            await upgradeTx.wait(1)
        })
    })
