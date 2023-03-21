import {developmentChains, qiBaseURI} from "../../../helper-hardhat-config";
import {deployments, ethers, network} from "hardhat";
import {ProxyAdmin, Qi, QiBackground, TransparentUpgradeableProxy} from "../../../typechain-types";
import {assert} from "chai";


!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Upgrading tests", function () {
        let qi: Qi, qiProxy: TransparentUpgradeableProxy, qiBackground: QiBackground, qiBackgroundProxy: TransparentUpgradeableProxy, qiProxyAdmin: ProxyAdmin, qiBackgroundProxyAdmin: ProxyAdmin
        beforeEach(async () => {
            await deployments.fixture(["all"])
            qiProxy = await ethers.getContract("Qi_Proxy")
            qi = await ethers.getContractAt("Qi", qiProxy.address)
            qiBackgroundProxy = await ethers.getContract("QiBackground_Proxy")
            qiBackground = await ethers.getContractAt("QiBackground", qiProxy.address)
            qiProxyAdmin = await ethers.getContract("QiProxyAdmin")
            qiBackgroundProxyAdmin = await ethers.getContract("QiBackgroundProxyAdmin")
        })
        it("can deploy and upgrade qi", async function () {
            const baseURI = await qi.BASE_URI()
            assert.equal(baseURI.toString(), qiBaseURI)

            await deployments.fixture(["qi"])
            const newQi = await ethers.getContract("Qi_Implementation")
            // Tests if the proxy upgrade doesn't fail
            const upgradeTx = await qiProxyAdmin.upgrade(qiProxy.address, newQi.address)
            await upgradeTx.wait(1)

            assert.equal(baseURI.toString(), qiBaseURI)
        })
        it("can deploy and upgrade qiBackground", async function () {
            const baseURI = await qiBackground.BASE_URI()
            assert.equal(baseURI.toString(), qiBaseURI)

            await deployments.fixture(["qiBackground"])
            const newQiBackground = await ethers.getContract("QiBackground_Implementation")
            // Tests if the proxy upgrade doesn't fail
            const upgradeTx = await qiBackgroundProxyAdmin.upgrade(qiBackgroundProxy.address, newQiBackground.address)
            await upgradeTx.wait(1)

            assert.equal(baseURI.toString(), qiBaseURI)
        })
    })