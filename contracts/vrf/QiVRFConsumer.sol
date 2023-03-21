// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./VRFConsumerBaseV2ProxyAdapter.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

abstract contract QiVRFConsumer is VRFConsumerBaseV2ProxyAdapter {
    // Chainlink VRF Variables
    VRFCoordinatorV2Interface private s_vrfCoordinator;
    uint64 private s_subscriptionId;
    bytes32 private s_gasLane;
    uint32 private s_callbackGasLimit;
    uint16 private REQUEST_CONFIRMATIONS = 3;

    struct VRFConsumerConfig {
        address vrfConsumerBase;
        uint64 subscriptionId;
        bytes32 gasLane;
        uint32 callbackGasLimit;
    }

    function initialize(VRFConsumerConfig memory config) internal {
        initialize(config.vrfConsumerBase);
        s_vrfCoordinator = VRFCoordinatorV2Interface(config.vrfConsumerBase);
        s_subscriptionId = config.subscriptionId;
        s_gasLane = config.gasLane;
        s_callbackGasLimit = config.callbackGasLimit;
    }

    function requestRandomWords(uint32 numWords) internal returns (uint256) {
        return
            s_vrfCoordinator.requestRandomWords(
                s_gasLane,
                s_subscriptionId,
                REQUEST_CONFIRMATIONS,
                s_callbackGasLimit,
                numWords
            );
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        mintNFTFromRandomness(requestId, randomWords);
    }

    function mintNFTFromRandomness(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal virtual;
}
