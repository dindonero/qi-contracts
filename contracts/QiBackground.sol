// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./interfaces/IQi.sol";
import "./vrf/QiVRFConsumer.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract QiBackground is QiVRFConsumer, Ownable, ERC721Enumerable {
    IQi public s_qi;

    uint256 public constant MAX_QI_BACKGROUND_VERSIONS = 24;
    uint256 public constant MINT_PRICE = 0.1 ether;

    modifier onlyQi() {
        require(msg.sender == s_qi, "QiTreasury: Only Qi can call this function.");
        _;
    }

    constructor(IQi _qi, VRFConsumerConfig memory vrfConfig) QiVRFConsumer(vrfConfig) {
        s_qi = _qi;
    }

    function mint() public {}
}
