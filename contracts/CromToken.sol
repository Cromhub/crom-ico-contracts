pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';

import './ClaimableTokens.sol';

contract CromToken is Ownable, ERC20, ClaimableTokens {
    using SafeMath for uint256;
    string public constant name = "CROM Token";
    string public constant symbol = "CROM";
    uint8 public constant decimals = 0;
    uint256 public constant INITIAL_SUPPLY = 10 ** 7;
    mapping (address => uint256) internal balances;
    mapping (address => mapping (address => uint256)) internal allowed;

    function CromToken() Ownable() ClaimableTokens(msg.sender) {
        totalSupply = INITIAL_SUPPLY;
        balances[msg.sender] = totalSupply;
    }

    function transfer(address to, uint256 value) public returns (bool success) {
        require(to != 0x0);
        require(balances[msg.sender] >= value);
        balances[msg.sender] = balances[msg.sender].sub(value);
        balances[to] = balances[to].add(value);
        Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) public returns (bool success) {
        allowed[msg.sender][spender] = value;
        Approval(msg.sender, spender, value);
        return true;
    }

    function allowance(address owner, address spender) public constant returns (uint256 remaining) {
        return allowed[owner][spender];
    }

    function balanceOf(address who) public constant returns (uint256) {
        return balances[who];
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool success) {
        require(to != 0x0);
        require(balances[from] >= value);
        require(value <= allowed[from][msg.sender]);
        balances[from] = balances[from].sub(value);
        balances[to] = balances[to].add(value);
        allowed[from][msg.sender] = allowed[from][msg.sender].sub(value);
        Transfer(from, to, value);
        return true;
    }
}
