pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/token/ERC20.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract ClaimableTokens is Ownable {

    address public claimedTokensWallet;

    function ClaimableTokens(address targetWallet) {
        claimedTokensWallet = targetWallet;
    }

    function claimTokens(address tokenAddress) public onlyOwner {
        require(tokenAddress != 0x0);
        ERC20 claimedToken = ERC20(tokenAddress);
        uint balance = claimedToken.balanceOf(this);
        claimedToken.transfer(claimedTokensWallet, balance);
    }
}
