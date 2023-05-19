// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

interface IYiqiTreasury {
    function depositETHFromMint() external payable returns (uint256);

    function withdrawByYiqiBurned(address receiver) external returns (uint256);
}
