// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

contract QiBackgroundProxyAdmin is ProxyAdmin {
    constructor(address /* owner */) ProxyAdmin() {}
}
