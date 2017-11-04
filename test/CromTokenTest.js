var CromToken = artifacts.require("./CromToken.sol");

import EVMThrow from "./helpers/EVMThrow";

const should = require('chai')
.use(require('chai-as-promised'))
.use(require('chai-bignumber')(web3.BigNumber))
.should();

contract('CromToken', function(accounts) {

    let cromToken;

    beforeEach(async function() {
        cromToken = await CromToken.new();
    })
    it("should put 10mil CromTokens in the first account", async function() {
        let balance = await cromToken.balanceOf.call(accounts[0]);
        balance.toNumber().should.equal(10 * Math.pow(10, 6));
    });

    it("should have total supply of 10mil", async function() {
        let totalSupply = await cromToken.totalSupply.call();
        totalSupply.toNumber().should.equal(10 * Math.pow(10, 6));
    });

    it("should transfer correctly", async function() {
        var amount = 10;
        let accountOneStartingBalance = await cromToken.balanceOf.call(accounts[0]);
        let accountTwoStartingBalance = await cromToken.balanceOf.call(accounts[1]);
        await cromToken.transfer(accounts[1], amount, {from: accounts[0]});
        let accountOneEndBalance = await cromToken.balanceOf.call(accounts[0]);
        let accountTwoEndBalance = await cromToken.balanceOf.call(accounts[1]);
        accountTwoEndBalance.toNumber().should.equal(accountTwoStartingBalance.toNumber() + amount);
        accountOneEndBalance.toNumber().should.equal(accountOneStartingBalance.toNumber() - amount);
    });

    it("should support approving", async function() {
        let allowance = await cromToken.allowance.call(accounts[0], accounts[1]);
        allowance.toNumber().should.equal(0);
        await cromToken.approve(accounts[1], 100, {from: accounts[0]});
        let allowanceAfterApproval = await cromToken.allowance.call(accounts[0], accounts[1]);
        allowanceAfterApproval.toNumber().should.equal(100);
    });

    it("should throw when transferring to 0x0", async function() {
        await cromToken.transfer("0x0", 1, {from: accounts[0]}).should.be.rejectedWith(EVMThrow);
    });

    it("should throw when transferring more than owned", async function() {
        await cromToken.transfer(accounts[1], 11 * Math.pow(10, 6), {from: accounts[0]}).should.be.rejectedWith(EVMThrow);
    });

    it("should throw when using transferFrom to 0x0", async function() {
        await cromToken.transferFrom(accounts[0], "0x0", 1, {from: accounts[1]}).should.be.rejectedWith(EVMThrow);
    });

    it("should throw when using transferFrom with no tokens", async function() {
        await cromToken.transferFrom(accounts[1], accounts[0], 1, {from: accounts[1]}).should.be.rejectedWith(EVMThrow);
    });

    it("should throw when using transferFrom with more than allowed", async function() {
        await cromToken.approve(accounts[1], 1, {from: accounts[0]});
        await cromToken.transferFrom(accounts[0], accounts[1], 2, {from: accounts[1]}).should.be.rejectedWith(EVMThrow);
    });

    it("should succesfully transferFrom", async function() {
        await cromToken.approve(accounts[1], 1, {from: accounts[0]});
        await cromToken.transferFrom(accounts[0], accounts[1], 1, {from: accounts[1]}).should.be.fulfilled;
        let balance = await cromToken.balanceOf.call(accounts[1]);
        balance.toNumber().should.equal(1);
    });

    it("should throw when using claiming token with address 0x0", async function() {
        await cromToken.claimTokens("0x0", {from: accounts[0]}).should.be.rejectedWith(EVMThrow);
    });

    it("should transfer claimed tokens to owner wallet", async function() {
        let newToken = await CromToken.new({from: accounts[1]});
        await newToken.transfer(cromToken.address, 100, {from: accounts[1]});
        await cromToken.claimTokens(newToken.address, {from: accounts[0]}).should.be.fulfilled;
        let balance = await newToken.balanceOf.call(accounts[0]);
        balance.toNumber().should.equal(100);
    });
});
