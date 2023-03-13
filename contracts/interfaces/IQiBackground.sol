// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IQiBackground {

    function mintBackgroundWithQi(uint256[] memory randomWords, address receiver) external returns (uint256);

}
