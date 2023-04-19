// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/uniswap/IWETH9.sol";

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./access/Governable.sol";

/**
 * @title QiTreasury
 * @notice This contract is used to manage the Qi treasury
 * @dev This contract assumes:
 * 1. The QiTreasury holds an unlimited amount of YAM
 * 2. Exists an already initialized position in the Uniswap wstETH <=> YAM pool
 */
contract QiTreasury is Governable {
    address public s_qi;

    IERC20 public immutable i_wstETH;

    address public immutable i_WETH;

    address public immutable i_DAI;

    IUniswapV2Router02 public immutable i_swapRouter;

    uint256 public s_numOutstandingNFTs;

    uint24 public constant POOL_FEE = 3000;

    address private s_teamMultisig;

    uint256 public immutable i_deployedTime;

    uint8 public s_numTeamWithdrawsPerformed;

    modifier onlyQi() {
        require(msg.sender == s_qi, "QiTreasury: Only Qi can call this function.");
        _;
    }

    constructor(
        address _qi,
        IERC20 _wstETH,
        address _WETH,
        address _DAI,
        IUniswapV2Router02 _swapRouter,
        address _yamGovernance,
        address _teamMultisig
    ) {
        s_qi = _qi;
        i_wstETH = _wstETH;
        i_WETH = _WETH;
        i_DAI = _DAI;
        i_swapRouter = _swapRouter;
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
    function withdrawByQiBurned(address receiver) external onlyQi returns (uint256 wethAmount) {
        uint256 wstETHAmount = i_wstETH.balanceOf(address(this)) / s_numOutstandingNFTs;

        // Retain 5% of the wstETH for the treasury
        uint256 reclaimableWstETH = (wstETHAmount * 95) / 100;

        // Swap wstETH for WETH -- future improvement: unstake when possible
        wethAmount = swapWstETHForWETH(reclaimableWstETH);
        IWETH9(i_WETH).withdraw(wethAmount);

        s_numOutstandingNFTs--;

        TransferHelper.safeTransferETH(receiver, wethAmount);
    }

    /**
     * @notice Withdraws 2% of the wstETH balance to the team multisig and yam governance
     * @dev Can only be called every 6 months
     */
    function withdrawTeamAndTreasuryFee() external {
        require(
            block.timestamp >=
                i_deployedTime + (6 * 30 days) * uint256(s_numTeamWithdrawsPerformed + 1),
            "QiTreasury: Can only withdraw every 6 months"
        );
        s_numTeamWithdrawsPerformed++;

        uint256 wstETHAmount = i_wstETH.balanceOf(address(this));
        uint256 withdrawableWstETHAmount = (wstETHAmount * 2) / 100;

        uint256 wethAmount = swapWstETHForWETH(withdrawableWstETHAmount);

        IWETH9(i_WETH).withdraw(wethAmount);

        uint256 ethFeeAmount = wethAmount / 2;

        TransferHelper.safeTransferETH(s_teamMultisig, ethFeeAmount);
        TransferHelper.safeTransferETH(gov, ethFeeAmount);
    }

    receive() external payable {
        if (msg.sender != address(i_WETH)) depositETHForWstETH(msg.value);
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
     * @param amount The amount of wstETH to remove
     * @param receiver The address of the owner of the NFT who will receive the funds
     */
    function removeLiquidity(uint256 amount, address receiver) external onlyGov {
        TransferHelper.safeTransfer(address(i_wstETH), receiver, amount);
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
        (bool sent /* bytes memory data */, ) = address(i_wstETH).call{value: amount}("");
        require(sent, "Failed to deposit ETH into Lido");
        return i_wstETH.balanceOf(address(this));
    }

    /**
     * @dev Swaps wstETH for WETH and returns the amount received
     * @dev Uses sushiswap router
     * @param wstETHAmount The amount of wstETH to swap
     * @return The amount of WETH received
     */
    function swapWstETHForWETH(uint256 wstETHAmount) internal returns (uint256) {
        TransferHelper.safeApprove(address(i_wstETH), address(i_swapRouter), wstETHAmount);

        address[] memory path = new address[](3);
        path[0] = address(i_wstETH);
        path[1] = i_DAI;
        path[2] = i_WETH;

        uint256[] memory amountsOut = i_swapRouter.swapExactTokensForTokens(
            wstETHAmount,
            0,
            path,
            address(this),
            block.timestamp
        );

        return amountsOut[amountsOut.length - 1];
    }
}
