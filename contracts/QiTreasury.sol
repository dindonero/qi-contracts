// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "./access/Governable.sol";
import "./interfaces/ICurvePool.sol";
import "./interfaces/ILido.sol";
import "./interfaces/IWETH9.sol";

/**
 * @title QiTreasury
 * @notice This contract is used to manage the Qi treasury
 * @dev All ETH it receives is converted to stETH and deposited into the Lido stETH pool
 * @dev The stETH is then redistributed among the NFT holders, rewarding late burners with extra stETH
 */
contract QiTreasury is Governable {
    address public s_qi;

    ILido public immutable i_stETH;

    IWETH9 public immutable i_WETH;

    ICurvePool internal immutable i_curveEthStEthPool;

    uint256 public s_numOutstandingNFTs;

    address private s_teamMultisig;

    uint256 public immutable i_deployedTime;

    uint8 public s_numTeamWithdrawsPerformed;

    address internal constant RESERVES = 0x97990B693835da58A281636296D2Bf02787DEa17;

    modifier onlyQi() {
        require(msg.sender == s_qi, "QiTreasury: Only Qi can call this function.");
        _;
    }

    constructor(
        address _qi,
        ILido _stETH,
        IWETH9 _WETH,
        ICurvePool _curveEthStEthPool,
        address _yamGovernance,
        address _teamMultisig
    ) {
        s_qi = _qi;
        i_stETH = _stETH;
        i_WETH = _WETH;
        i_curveEthStEthPool = _curveEthStEthPool;
        i_deployedTime = block.timestamp;
        s_teamMultisig = _teamMultisig;
        _setGov(_yamGovernance);
    }

    /////////////////////////////////////////////////
    ///             OnlyQi functions              ///
    /////////////////////////////////////////////////

    /**
     * @dev Deposits ETH into Lido's contract and then deposits the wstETH into the Uniswap position
     * @dev Stores the liquidity amount in a QiTokenNFT mapping and returns the amount of wstETH received
     * @return The amount of stETH received
     */
    function depositETHFromMint() external payable onlyQi returns (uint256) {
        s_numOutstandingNFTs++;

        // Deposit ETH into Lido and receive stETH
        uint256 stETHAmount = depositETHForStETH(msg.value);

        return stETHAmount;
    }

    /**
     * @dev Swaps stETH for ETH and returns the amount received
     * @param receiver The address of the owner of the NFT who will receive the funds
     */
    function withdrawByQiBurned(address receiver) external onlyQi returns (uint256 ethAmount) {
        uint256 stETHAmount = i_stETH.balanceOf(address(this)) / s_numOutstandingNFTs;

        // Retain 5% of the stETH for the treasury
        uint256 reclaimableStETH = (stETHAmount * 95) / 100;

        // Swap StETH for ETH -- future improvement: unstake when possible
        swapStETHForETH(reclaimableStETH);

        s_numOutstandingNFTs--;

        ethAmount = address(this).balance;
        TransferHelper.safeTransferETH(receiver, ethAmount);
    }

    /**
     * @notice Withdraws 2% of the StETH balance to the team multisig and yam governance reserves
     * @dev Can only be called every 6 months
     */
    function withdrawTeamAndTreasuryFee() external {
        require(
            block.timestamp >=
                i_deployedTime + (6 * 30 days) * uint256(s_numTeamWithdrawsPerformed + 1),
            "QiTreasury: Can only withdraw every 6 months"
        );
        s_numTeamWithdrawsPerformed++;

        uint256 stETHAmount = i_stETH.balanceOf(address(this));
        uint256 withdrawableStETHAmount = (stETHAmount * 2) / 100;

        swapStETHForETH(withdrawableStETHAmount);

        i_WETH.deposit{value: address(this).balance}();

        uint256 wethAmount = i_WETH.balanceOf(address(this));

        uint256 wethFeeAmount = wethAmount / 2;

        TransferHelper.safeTransfer(address(i_WETH), s_teamMultisig, wethFeeAmount);
        TransferHelper.safeTransfer(address(i_WETH), RESERVES, wethFeeAmount);
    }

    receive() external payable {
        if (msg.sender != address(i_curveEthStEthPool)) depositETHForStETH(msg.value);
    }

    /////////////////////////////////////////////////
    ///             OnlyGov functions             ///
    /////////////////////////////////////////////////

    /**
     * @notice Sets the Qi address
     * @param _qi The address of the Qi contract
     */
    function setQi(address _qi) external onlyGov {
        s_qi = _qi;
    }

    /**
     * @notice Sets the team multisig address
     * @param _teamMultisig The address of the team multisig
     */
    function setTeamMultisig(address _teamMultisig) external onlyGov {
        s_teamMultisig = _teamMultisig;
    }

    /**
     * @notice Removes all liquidity
     * @dev Emergency function - can only be called by governance
     * @param amount The amount of stETH to remove
     * @param receiver The address of the owner of the NFT who will receive the funds
     */
    function removeLiquidity(uint256 amount, address receiver) external onlyGov {
        TransferHelper.safeTransfer(address(i_stETH), receiver, amount);
    }

    /////////////////////////////////////////////////
    ///           Internal functions              ///
    /////////////////////////////////////////////////

    /**
     * @dev Deposits ETH into Lido's contract and returns the amount of stETH received
     * @param amount The amount to deposit in Lido's stETH contract
     * @return The amount of stETH received
     */
    function depositETHForStETH(uint256 amount) internal returns (uint256) {
        i_stETH.submit{value: amount}(address(0));
        return i_stETH.balanceOf(address(this));
    }

    /**
     * @dev Swaps stETH for ETH and returns the amount received
     * @dev Uses sushiswap router
     * @param stETHAmount The amount of stETH to swap
     */
    function swapStETHForETH(uint256 stETHAmount) internal {

        uint256 stEthAmount = i_stETH.balanceOf(address(this));

        i_stETH.approve(address(i_curveEthStEthPool), stEthAmount);
        i_curveEthStEthPool.exchange(1, 0, stEthAmount, 0); // TODO: define minAmountOut to prevent MEV
    }
}
