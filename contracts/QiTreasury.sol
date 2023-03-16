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

    IERC20 public s_wstETH;

    address public s_WETH;

    ISwapRouter public immutable i_swapRouter;

    uint256 public s_numOutstandingNFTs;

    uint24 public constant POOL_FEE = 3000;

    address private s_teamMultisig;

    address private s_yamGovernance;

    uint256 public immutable i_deployedTime;

    uint256 public s_numTeamWithdraws;

    modifier onlyQi() {
        require(msg.sender == s_qi, "QiTreasury: Only Qi can call this function.");
        _;
    }

    constructor(
        address _qi,
        IERC20 _wstETH,
        address _WETH,
        ISwapRouter _swapRouter,
        address _yamGovernance,
        address _teamMultisig
    ) {
        s_qi = _qi;
        s_wstETH = _wstETH;
        s_WETH = _WETH;
        i_swapRouter = _swapRouter;
        i_deployedTime = block.timestamp;
        s_teamMultisig = _teamMultisig;
        s_yamGovernance = _yamGovernance;
        transferOwnership(_yamGovernance);
    }

    /////////////////////////////////////////////////
    ///             OnlyQi functions              ///
    /////////////////////////////////////////////////

    /**
     * @dev Deposits ETH into Lido's contract and then deposits the wstETH into the Uniswap position
     * @dev Stores the liquidity amount in a QiTokenNFT mapping and returns the amount of wstETH received
     * @return The amount of wstETH received
     */
    function depositETHFromMint() external payable onlyQi returns (uint256) {
        // Deposit ETH into Lido and receive wstETH
        uint256 wstETHAmount = depositETHForWstETH(msg.value);

        s_numOutstandingNFTs++;

        return wstETHAmount;
    }

    /**
     * @dev Swaps wstETH for ETH and returns the amount received
     * @param receiver The address of the owner of the NFT who will receive the funds
     */
    function withdrawByQiBurned(address receiver) external onlyQi {
        uint256 wstETHAmount = s_wstETH.balanceOf(address(this)) / s_numOutstandingNFTs;

        // Retain 5% of the wstETH for the treasury
        uint256 reclaimableWstETH = (wstETHAmount * 95) / 100;

        // Swap wstETH for WETH -- future improvement: unstake when possible
        uint256 wethAmount = swapWstETHForWETH(reclaimableWstETH);
        IWETH9(s_WETH).withdraw(wethAmount);

        s_numOutstandingNFTs--;

        TransferHelper.safeTransferETH(receiver, wethAmount);
    }

    function withdrawTeamAndTreasuryFee() external {
        require(
            block.timestamp >= i_deployedTime + (6 * 30 days) * (s_numTeamWithdraws + 1),
            "Function can only be called every 6 months"
        );
        s_numTeamWithdraws++;

        uint256 wstETHAmount = s_wstETH.balanceOf(address(this));
        uint256 withdrawableWstETHAmount = (wstETHAmount * 2) / 100;

        uint256 wethAmount = swapWstETHForWETH(withdrawableWstETHAmount);

        IWETH9(s_WETH).withdraw(wethAmount);

        uint256 ethFeeAmount = wethAmount / 2;

        TransferHelper.safeTransferETH(s_teamMultisig, ethFeeAmount);
        TransferHelper.safeTransferETH(s_yamGovernance, ethFeeAmount);
    }

    receive() external payable {
        depositETHForWstETH(msg.value);
    }

    /////////////////////////////////////////////////
    ///             OnlyOwner functions           ///
    /////////////////////////////////////////////////

    function setQi(address _qi) external onlyOwner {
        s_qi = _qi;
    }

    function setTeamMultisig(address _teamMultisig) external onlyOwner {
        s_teamMultisig = _teamMultisig;
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
