// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

abstract contract QiVRFConsumer is VRFConsumerBaseV2 {
    // Chainlink VRF Variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;

    struct VRFConsumerConfig {
        address vrfConsumerBase;
        uint64 subscriptionId;
        bytes32 gasLane;
        uint32 callbackGasLimit;
    }

    constructor(VRFConsumerConfig memory config) VRFConsumerBaseV2(config.vrfConsumerBase) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(config.vrfConsumerBase);
        i_subscriptionId = config.subscriptionId;
        i_gasLane = config.gasLane;
        i_callbackGasLimit = config.callbackGasLimit;
    }

    function requestRandomWords(uint32 numWords) internal returns (uint256) {
        return
            i_vrfCoordinator.requestRandomWords(
                i_gasLane,
                i_subscriptionId,
                REQUEST_CONFIRMATIONS,
                i_callbackGasLimit,
                numWords
            );
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        mintNFTFromRandomness(requestId, randomWords);
    }

    function mintNFTFromRandomness(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal virtual;
}
