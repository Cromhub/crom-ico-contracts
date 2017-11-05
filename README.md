# CROM ICO contracts
[![Build Status](https://travis-ci.org/Cromhub/crom-ico-contracts.svg?branch=master)](https://travis-ci.org/Cromhub/crom-ico-contracts)
[![Coverage Status](https://coveralls.io/repos/github/Cromhub/crom-ico-contracts/badge.svg?branch=master)](https://coveralls.io/github/Cromhub/crom-ico-contracts?branch=master)  

This repository contains all Ethereum smart contracts used throughout CROMhub
ICO. For more information regarding the ICO, please visit https://cromhub.com.

## Getting started
### Running tests
```
npm install
npm test
```
Running `npm test` will
- start a testrpc instance on port 8545
- compile the contracts
- deploy them on the testrpc instance
- run all tests from `test/`

### Running test coverage
```
npm run coverage
```

## Contracts
A brief descrption of the contracts built for
the ICO.

### CromToken

A standard ERC20 token contract implementing interface provided by OpenZeppelin

### CromIco
A custom contract responsible for operating the
ICO.

#### Events
- `TokenPurchase(address indexed purchaser, uint256 value, uint256 amount);`  
    Fired when a succesful prurchase is made.  
    Parameters:
    - `purchaser` the address of the purchaser
    - `value` the amount of Ether contributed
    - `amount` the amount of tokens bought

#### Public fields
- `uint public preStartTime`  
    The time the pre ico stage becomes active.
- `uint public startTime`  
    The time the public ico stage becomes active.
- `uint public endTime`  
    The time the ICO will end.
- `address public targetWallet`  
    The address to which funds will be
    transferred if the ICO is succesful.
- `bool public targetWalletVerified`  
    Is `true` if the target wallet has been
    verified.
- `mapping (address => uint256) public balanceOf`  
    Holds the amount of funds sent per
    contributor.
- `mapping (address => bool) public preIcoMembers`  
    Holds the list of wallets allowed to take part in the pre
    ICO.
- `uint256 public amountRaised`  
    Amount of funds raised;
- `uint256 public tokensSold`  
    Number of tokens sold;

#### Public methods
- `function isPreIcoActive() public constant returns (bool);`  
    Returns true if Pre ICO stage is active.
- `function isPublicIcoActive() public constant returns (bool);`  
    Returns true if Public ICO stage is active.
- `function hasEnded() public constant returns (bool);`  
    Returns true if the ICO is finished.
- `function softCapReached() public constant returns (bool);`  
    Returns true if soft cap has been reached.
- `function withdrawFunds() public atStage(Stages.AfterIco) returns(bool);`  
    Transfer the funds back to the contributer
    in case the ICO hasn't reached the soft cap
    and is finished.
