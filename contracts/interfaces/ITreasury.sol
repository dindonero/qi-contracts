// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

interface ITreasury {
    function depositETHFromMint() external payable returns (uint256);

    function withdrawByQiBurned(address receiver) external returns (uint256);
}
