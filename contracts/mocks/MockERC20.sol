// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "solady/src/tokens/ERC20.sol";

/**
 * @title MockERC20
 * @dev Mock ERC20 token for testing purposes with 4 decimals
 */
contract MockERC20 is ERC20 {
    constructor() ERC20() {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function name() public view virtual override returns (string memory) {
        return "Mock Token";
    }

    function symbol() public view virtual override returns (string memory) {
        return "MOCK";
    }

    function decimals() public view virtual override returns (uint8) {
        return 4;
    }
}
