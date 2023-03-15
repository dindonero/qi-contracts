// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

contract QiProxyAdmin is ProxyAdmin {
    constructor(address /* owner */) ProxyAdmin() {}
}