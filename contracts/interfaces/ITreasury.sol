// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface ITreasury {
    function depositETHFromMint() external payable returns (uint256);

    function withdrawByQiBurned(address receiver) external;
}
