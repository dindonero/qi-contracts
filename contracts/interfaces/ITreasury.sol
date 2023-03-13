// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface ITreasury {
    function depositETHFromMint(uint256 qiTokenId) external payable returns (uint256);

    function withdrawByQiBurned(uint256 wstETHAmount, address receiver) external;
}
