pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20.sol';
import './CromToken.sol';
import './ClaimableTokens.sol';

contract CromIco is Ownable, ClaimableTokens {
    using SafeMath for uint256;

    CromToken public token;

    // start and end timestamps where investments are allowed (both inclusive)
    uint public preStartTime;
    uint public startTime;
    uint public endTime;

    // address where funds are collected
    address public targetWallet;
    bool public targetWalletVerified;

    // caps definitions
    uint256 public constant SOFT_CAP = 8000 ether;
    uint256 public constant HARD_CAP = 56000 ether;

    // token price
    uint256 public constant TOKEN_PRICE = 10 finney;

    uint public constant BONUS_BATCH = 2 * 10 ** 6;
    uint public constant BONUS_PERCENTAGE = 25;
    uint256 public constant MINIMAL_PRE_ICO_INVESTMENT = 10 ether;

    // ICO duration
    uint public constant PRE_DURATION = 14 days;
    uint public constant DURATION = 14 days;

    // contributions per individual
    mapping (address => uint256) public balanceOf;

    // wallets allowed to take part in the pre ico
    mapping (address => bool) public preIcoMembers;

    // total amount of funds raised
    uint256 public amountRaised;

    uint256 public tokensSold;

    bool public paused;

    enum Stages {
        WalletUnverified,
        BeforeIco,
        Payable,
        AfterIco
    }

    enum PayableStages {
        PreIco,
        PublicIco
    }

    event TokenPurchase(address indexed purchaser, uint256 value, uint256 amount);

    // Constructor
    function CromIco(address tokenAddress, address beneficiaryWallet) Ownable() ClaimableTokens(beneficiaryWallet) {
        token = CromToken(tokenAddress);
        preStartTime = now;
        startTime = preStartTime + PRE_DURATION;
        endTime = startTime + DURATION;
        targetWallet = beneficiaryWallet;
        targetWalletVerified = false;
        paused = false;
    }

    modifier atStage(Stages stage) {
        require(stage == getCurrentStage());
        _;
    }

    // fallback function can be used to buy tokens
    function() payable atStage(Stages.Payable) {
        buyTokens();
    }

  // low level token purchase function
    function buyTokens() internal {
        require(msg.sender != 0x0);
        require(msg.value > 0);
        require(!paused);

        uint256 weiAmount = msg.value;

        // calculate token amount to be transferred
        uint256 tokens = calculateTokensAmount(weiAmount);
        require(tokens > 0);
        require(token.balanceOf(this) >= tokens);

        if (PayableStages.PreIco == getPayableStage()) {
            require(preIcoMembers[msg.sender]);
            require(weiAmount.add(balanceOf[msg.sender]) >= MINIMAL_PRE_ICO_INVESTMENT);
            require(tokensSold.add(tokens) <= BONUS_BATCH);
        }

        amountRaised = amountRaised.add(weiAmount);
        balanceOf[msg.sender] = balanceOf[msg.sender].add(weiAmount);
        tokensSold = tokensSold.add(tokens);
        token.transfer(msg.sender, tokens);

        TokenPurchase(msg.sender, weiAmount, tokens);
    }

    function verifyTargetWallet() public atStage(Stages.WalletUnverified) {
        require(msg.sender == targetWallet);
        targetWalletVerified = true;
    }

    // add a list of wallets to be allowed to take part in pre ico
    function addPreIcoMembers(address[] members) public onlyOwner {
        for (uint i = 0; i < members.length; i++) {
            preIcoMembers[members[i]] = true;
        }
    }

    // remove a list of wallets to be allowed to take part in pre ico
    function removePreIcoMembers(address[] members) public onlyOwner {
        for (uint i = 0; i < members.length; i++) {
            preIcoMembers[members[i]] = false;
        }
    }

    // @return true if the ICO is in pre ICO phase
    function isPreIcoActive() public constant returns (bool) {
        bool isPayable = Stages.Payable == getCurrentStage();
        bool isPreIco = PayableStages.PreIco == getPayableStage();
        return isPayable && isPreIco;
    }

    // @return true if the public ICO is in progress
    function isPublicIcoActive() public constant returns (bool) {
        bool isPayable = Stages.Payable == getCurrentStage();
        bool isPublic = PayableStages.PublicIco == getPayableStage();
        return isPayable && isPublic;
    }

    // @return true if ICO has ended
    function hasEnded() public constant returns (bool) {
        return Stages.AfterIco == getCurrentStage();
    }

    // @return true if the soft cap has been reached
    function softCapReached() public constant returns (bool) {
        return amountRaised >= SOFT_CAP;
    }

    // withdraw the contributed funds if the ICO has
    // ended and the goal has not been reached
    function withdrawFunds() public atStage(Stages.AfterIco) returns(bool) {
        require(!softCapReached());
        require(balanceOf[msg.sender] > 0);

        uint256 balance = balanceOf[msg.sender];

        balanceOf[msg.sender] = 0;
        msg.sender.transfer(balance);
        return true;
    }

    // transfer the raised funds to the target wallet if
    // the ICO is over and the goal has been reached
    function finalizeIco() public onlyOwner atStage(Stages.AfterIco) {
        require(softCapReached());
        targetWallet.transfer(this.balance);
    }

    function withdrawUnsoldTokens() public onlyOwner atStage(Stages.AfterIco) {
        token.transfer(targetWallet, token.balanceOf(this));
    }

    function pause() public onlyOwner {
        require(!paused);
        paused = true;
    }

    function resume() public onlyOwner {
        require(paused);
        paused = false;
    }

    function changeTargetWallet(address wallet) public onlyOwner {
        targetWallet = wallet;
        targetWalletVerified = false;
    }

    function calculateTokensAmount(uint256 funds) internal returns (uint256) {
        uint256 tokens = funds.div(TOKEN_PRICE);
        if (tokensSold < BONUS_BATCH) {
            if (tokensSold.add(tokens) > BONUS_BATCH) {
                uint256 bonusBaseTokens = BONUS_BATCH.mul(100).div(125).sub(tokensSold);
                tokens = tokens.add(bonusBaseTokens.mul(BONUS_PERCENTAGE).div(100));
            } else {
                tokens = tokens.mul(BONUS_PERCENTAGE + 100).div(100);
            }
        }
        return tokens;
    }

    function getCurrentStage() internal constant returns (Stages) {
        if (!targetWalletVerified) {
            return Stages.WalletUnverified;
        } else if (now < preStartTime) {
            return Stages.BeforeIco;
        } else if (now < endTime && amountRaised < HARD_CAP) {
            return Stages.Payable;
        } else {
            return Stages.AfterIco;
        }
    }

    function getPayableStage() internal constant returns (PayableStages) {
        if (now < startTime) {
            return PayableStages.PreIco;
        } else {
            return PayableStages.PublicIco;
        }
    }
}
