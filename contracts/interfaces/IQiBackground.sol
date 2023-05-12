// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

interface IQiBackground {
    function mintBackgroundWithQi(
        address receiver
    ) external returns (uint256);
}
