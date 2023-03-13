// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/uniswap/IWETH9.sol";

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";


/**
 * @title QiTreasury
 * @notice This contract is used to manage the Qi treasury
 * @dev This contract assumes:
 * 1. The QiTreasury holds an unlimited amount of YAM
 * 2. Exists an already initialized position in the Uniswap wstETH <=> YAM pool
 */
contract QiTreasury is Ownable {
    address public s_qi;

    mapping(uint256 => uint256) s_qiTokenIdToWstETHAmount;

    IERC20 public s_wstETH;

    address public s_WETH;

    uint256 public s_feeWstETHAmount;

    ISwapRouter public immutable i_swapRouter;

    uint24 public constant POOL_FEE = 3000;

    modifier onlyQi() {
        require(msg.sender == s_qi, "QiTreasury: Only Qi can call this function.");
        _;
    }

    constructor(
        address _qi,
        IERC20 _wstETH,
        address _WETH,
        ISwapRouter _swapRouter
    ) {
        s_qi = _qi;
        s_wstETH = _wstETH;
        s_WETH = _WETH;
        i_swapRouter = _swapRouter;
    }

    /////////////////////////////////////////////////
    ///             OnlyQi functions              ///
    /////////////////////////////////////////////////

    /**
     * @dev Deposits ETH into Lido's contract and then deposits the wstETH into the Uniswap position
     * @dev Stores the liquidity amount in a QiTokenNFT mapping and returns the amount of wstETH received
     * @param qiTokenId The Qi token id that was minted for the deposit
     * @return The amount of wstETH received
     */
    function depositETHFromMint(uint256 qiTokenId) external payable onlyQi returns (uint256) {
        // Deposit ETH into Lido and receive wstETH
        uint256 wstETHAmount = depositETHForWstETH(msg.value);

        s_qiTokenIdToWstETHAmount[qiTokenId] = wstETHAmount;

        return wstETHAmount;
    }

    /**
     * @dev Swaps wstETH for ETH and returns the amount received
     * @param qiTokenId The Qi token id that was burned for the withdrawal
     */
    function withdrawByQiBurned(uint256 qiTokenId, address receiver) external onlyQi {

        uint256 wstETHAmount = s_qiTokenIdToWstETHAmount[qiTokenId];

        // Retain 5% of the wstETH for the treasury
        uint256 reclaimableWstETH = (wstETHAmount * 95) / 100;
        // TODO TEAM: change to (wstETHAmount * 95) / 100 + (extraWstETH / #nfts); define if the extra 5% are divided among all the nfts or not
        // TODO: send 2% to team and 2% to yam treasury (define team and yam treasury addresses)

        s_feeWstETHAmount += wstETHAmount - reclaimableWstETH;

        // Swap wstETH for WETH -- future improvement: unstake when possible
        uint256 wethAmount = swapWstETHForWETH(reclaimableWstETH);
        IWETH9(s_WETH).withdraw(wethAmount);


        TransferHelper.safeTransferETH(receiver, wethAmount);
    }

    receive() external payable {
        // TODO TEAM: define what to do with ETH received from royalties and background purchases
        // and define withdraw function
    }

    /////////////////////////////////////////////////
    ///             OnlyOwner functions           ///
    /////////////////////////////////////////////////

    // TODO TEAM: define what owner function are needed
    function withdrawWstETH() external onlyOwner {
        TransferHelper.safeTransfer(address(s_wstETH), msg.sender, s_feeWstETHAmount);
    }

    function setQi(address _qi) external onlyOwner {
        s_qi = _qi;
    }

    /////////////////////////////////////////////////
    ///           Internal functions              ///
    /////////////////////////////////////////////////

    /**
     * @dev Deposits ETH into Lido's contract and returns the amount of wstETH received
     * @param amount The amount to deposit in Lido's wstETH contract
     * @return The amount of wstETH received
     */
    function depositETHForWstETH(uint256 amount) internal returns (uint256) {
        payable(address(s_wstETH)).transfer(amount);
        return s_wstETH.balanceOf(address(this));
    }

    function swapWstETHForWETH(uint256 wstETHAmount) internal returns (uint256 amountOut) {
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(s_wstETH),
            tokenOut: s_WETH,
            fee: POOL_FEE,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: wstETHAmount,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });

        amountOut = i_swapRouter.exactInputSingle(params);
    }
}
