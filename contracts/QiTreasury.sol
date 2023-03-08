// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
//import '@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol';
import './interfaces/uniswap/INonfungiblePositionManager.sol';
//import '@uniswap/v3-periphery/contracts/interfaces/external/IWETH9.sol';
import './interfaces/uniswap/IWETH9.sol';

/**
 * @title QiTreasury
 * @notice This contract is used to manage the Qi treasury
 * @dev This contract assumes:
 * 1. The QiTreasury holds an unlimited amount of YAM
 * 2. Exists an already initialized position in the Uniswap wstETH <=> YAM pool
 */
contract QiTreasury is Ownable {

    address public s_qi;

    mapping(uint256 => uint128) s_qiTokenIdToLiquidityProvided;

    IERC20 public s_wstETH;
    IERC20 public s_yam;

    address public s_WETH;
    ISwapRouter internal immutable i_swapRouter;

    INonfungiblePositionManager public immutable i_nonfungiblePositionManager;
    uint256 public s_poolTokenId;

    uint24 public constant POOL_FEE = 3000;


    modifier onlyQi() {
        require(msg.sender == s_qi, "QiTreasury: Only Qi can call this function.");
        _;
    }

    constructor(address _qi, IERC20 _wstETH, IERC20 _yam, address _WETH, ISwapRouter _swapRouter, INonfungiblePositionManager _nonfungiblePositionManager, uint256 _poolTokenId) {
        s_qi = _qi;
        s_wstETH = _wstETH;
        s_yam = _yam;
        s_WETH = _WETH;
        i_swapRouter = _swapRouter;
        i_nonfungiblePositionManager = _nonfungiblePositionManager;
        s_poolTokenId = _poolTokenId;
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
    function depositETHFromMint(uint256 qiTokenId) external payable onlyQi returns (uint256){
        uint256 wstETHAmount = depositETHForWstETH(msg.value);
        (uint128 liquidity, , ) = increaseLiquidityCurrentRange(wstETHAmount);
        s_qiTokenIdToLiquidityProvided[qiTokenId] = liquidity;
        return wstETHAmount;
    }


    /**
     * @dev Withdraws ETH from the uniswap pool and returns the amount of WETH received
     * @param qiTokenId The Qi token id that was burned for the withdrawal
     */
    function withdrawWstETH(uint256 qiTokenId, address receiver) external onlyQi {
        uint128 liquidity = s_qiTokenIdToLiquidityProvided[qiTokenId];

        uint256 wstETHAmount = decreaseLiquidity(liquidity);

        delete s_qiTokenIdToLiquidityProvided[qiTokenId];

        uint256 wethAmount = swapWstETHForWETH(wstETHAmount);

        IWETH9(s_WETH).withdraw(wethAmount);

        TransferHelper.safeTransferETH(receiver, wethAmount);
    }


    /////////////////////////////////////////////////
    ///             OnlyOwner functions           ///
    /////////////////////////////////////////////////


    function withdrawYam(uint256 yamAmount) external onlyOwner returns (uint256) {
        s_yam.transfer(msg.sender, yamAmount);
        return yamAmount;
    }

    function withdrawWstETH(uint256 wstETHAmount) external onlyOwner returns (uint256) {
        s_wstETH.transfer(msg.sender, wstETHAmount);
        return wstETHAmount;
    }


    /*
     * @notice Transfers the position NFT to the contract and sets its params
     */
    function setPositionNFT(uint256 poolTokenId) external onlyOwner {
        require(s_poolTokenId == 0, "QiTreasury: Position already set");
        i_nonfungiblePositionManager.safeTransferFrom(msg.sender, address(this), poolTokenId);
        s_poolTokenId = poolTokenId;
    }


    /*
     * @notice Transfers the position NFT to the owner
     */
    function retrievePositionNFT() external onlyOwner {
        i_nonfungiblePositionManager.safeTransferFrom(address(this), msg.sender, s_poolTokenId);
        s_poolTokenId = 0;
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
        ISwapRouter.ExactInputSingleParams memory params =
        ISwapRouter.ExactInputSingleParams({
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

    function setQi(address _qi) external onlyOwner {
        s_qi = _qi;
    }


    /**
     * @notice Increases liquidity in the current position range
     * @dev Pool must be initialized already to add liquidity
     * @param wstETHAmount The amount to add of wstETH
     // TODO: if this does not work, go to stephen's version and calculate liquidity by liquidity = LiquidityAmounts.getLiquidityForAmounts in LiquidityManagement.sol
     */
    function increaseLiquidityCurrentRange(
        uint256 wstETHAmount
    )
    internal
    returns (
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    ) {
        // Calculates the order of the tokens in the pool
        (address token0, address token1) = address(s_wstETH) < address(s_yam) ? (address(s_wstETH), address(s_yam)) : (address(s_yam), address(s_wstETH));
        (uint256 amountAdd0, uint256 amountAdd1) = address(s_wstETH) < address(s_yam) ? (wstETHAmount, s_yam.balanceOf(address(this))) : (s_yam.balanceOf(address(this)), wstETHAmount);

        TransferHelper.safeApprove(token0, address(i_nonfungiblePositionManager), amountAdd0);
        TransferHelper.safeApprove(token1, address(i_nonfungiblePositionManager), amountAdd1);

        INonfungiblePositionManager.IncreaseLiquidityParams memory params = INonfungiblePositionManager.IncreaseLiquidityParams({
            tokenId: s_poolTokenId,
            amount0Desired: amountAdd0,
            amount1Desired: amountAdd1,
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp
        });

        (liquidity, amount0, amount1) = i_nonfungiblePositionManager.increaseLiquidity(params);
    }


    /**
     * @notice A function that removes the liquidity provided by the minting of a QiNFT
     * @param liquidity The amount of liquidity to remove
     * @return wstETHAmount The amount received back in wstETH
     */
    function decreaseLiquidity(uint128 liquidity) internal returns (uint256 wstETHAmount) {

        INonfungiblePositionManager.DecreaseLiquidityParams memory params =
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: s_poolTokenId,
                liquidity: liquidity,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
        });

        (uint256 amount0, uint256 amount1) = i_nonfungiblePositionManager.decreaseLiquidity(params);

        wstETHAmount = address(s_wstETH) < address(s_yam) ? amount0 : amount1;
    }
}