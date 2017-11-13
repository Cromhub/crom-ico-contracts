const CromIco = artifacts.require("./CromIco.sol");
const CromToken = artifacts.require("./CromToken.sol");

import EVMThrow from "./helpers/EVMThrow";
import {skipPreIco, skipToEnd} from "./helpers/TimeHelpers";
import {skipInTestCoverage} from "./helpers/TestControl";
import {BigNumber} from "bignumber.js";

const should = require('chai')
.use(require('chai-as-promised'))
.use(require('chai-bignumber')(web3.BigNumber))
.should();

contract('CromIco', function(accounts) {

    let icoContract;
    let cromToken;
    let targetWallet = accounts[3];

    const ONE_ETHER = web3.toWei(1, "ether");
    const PRE_ICO_MAX_ETHER = web3.toWei(16000, "ether");
    const SOFT_CAP_ETHER = web3.toWei(8000, "ether");
    const HARD_CAP_ETHER = web3.toWei(56000, "ether");

    beforeEach(async function() {
        cromToken = await CromToken.new();
        icoContract = await CromIco.new(cromToken.address, targetWallet);
        await cromToken.transfer(icoContract.address, 6 * Math.pow(10, 6));
        await icoContract.verifyTargetWallet({from: targetWallet});
    });

    it("should hold 6mil tokens after deployment", async function() {
        let balance = await cromToken.balanceOf.call(icoContract.address)
        balance.toNumber().should.be.bignumber.equal(6 * Math.pow(10, 6));
    });

    it("should start with pre ico phase", async function() {
        let isPreIcoActive = await icoContract.isPreIcoActive.call();
        isPreIcoActive.should.equal(true);
    });

    it("should start public ico after pre ico", async function() {
        await skipPreIco();
        let status = await icoContract.isPublicIcoActive.call();
        status.should.equal(true);
    });

    it("should transfer tokens immediately", async function() {
        await skipPreIco();
        await icoContract.sendTransaction({value: SOFT_CAP_ETHER, from: accounts[1]}).should.be.fulfilled;
        let balance = await cromToken.balanceOf.call(accounts[1]);
        balance.toNumber().should.be.bignumber.equal(Math.pow(10, 6));
    });

    it("should throw if the amount paid is less than token price", async function() {
        await skipPreIco();
        await icoContract.sendTransaction({value: web3.toWei(1, "finney"), from: accounts[1]}).should.be.rejectedWith(EVMThrow);
        let balance = await cromToken.balanceOf.call(accounts[1]);
        balance.toNumber().should.equal(0);
    });

    it("should calculate the correct tokens amount during price transition", async function() {
        await skipPreIco();
        await icoContract.sendTransaction({value: SOFT_CAP_ETHER * 4, from: accounts[1]}).should.be.fulfilled;
        let balance = await cromToken.balanceOf.call(accounts[1]);
        balance.toNumber().should.be.bignumber.equal(3.6 * Math.pow(10, 6));
    });

    it("should throw when a nonmember tries to invest in preico", async function() {
        await icoContract.sendTransaction({value: web3.toWei(100, "ether"), from: accounts[1]}).should.be.rejectedWith(EVMThrow);
    });

    it("should allow to add and remove members in pre ico", async function() {
        let status = await icoContract.preIcoMembers.call(accounts[1]);
        status.should.equal(false);
        await icoContract.addPreIcoMembers([accounts[1]]);
        let status2 = await icoContract.preIcoMembers.call(accounts[1]);
        status2.should.equal(true);
        await icoContract.removePreIcoMembers([accounts[1]]);
        let status3 = await icoContract.preIcoMembers.call(accounts[1]);
        status3.should.equal(false);
    });

    it("should allow members to invest in pre ico", async function() {
        let isPreIcoActive = await icoContract.isPreIcoActive.call();
        let status = await icoContract.preIcoMembers.call(accounts[1]);
        await icoContract.addPreIcoMembers([accounts[1]]);
        let status2 = await icoContract.preIcoMembers.call(accounts[1]);
        await icoContract.sendTransaction({value: web3.toWei(8000, "ether"), from: accounts[1]});
        let balance = await cromToken.balanceOf.call(accounts[1]);
        isPreIcoActive.should.equal(true);
        status.should.equal(false);
        status2.should.equal(true);
        balance.toNumber().should.be.bignumber.equal(Math.pow(10, 6));
    });

    it("should throw when sending less than minimal investment during pre ico", async function() {
        await icoContract.addPreIcoMembers([accounts[1]]);
        await icoContract.sendTransaction({value: web3.toWei(9, "ether"), from: accounts[1]}).should.be.rejectedWith(EVMThrow);
    });

    it("should throw when trying to buy more tokens in pre ico than avaialble", async function() {
        await icoContract.addPreIcoMembers([accounts[1]]);
        await icoContract.sendTransaction({value: PRE_ICO_MAX_ETHER, from: accounts[1]});
        await icoContract.sendTransaction({value: web3.toWei(10, "ether"), from: accounts[1]}).should.be.rejectedWith(EVMThrow);
    });

    it("should throw when making making a zero purchase", async function() {
        await skipPreIco();
        await icoContract.sendTransaction({value: 0, from: accounts[1]}).should.be.rejectedWith(EVMThrow);
    });

    it("should throw when trying to buy more tokens than avaialble", async function() {
        await skipPreIco();
        await icoContract.sendTransaction({value: HARD_CAP_ETHER * 2, from: accounts[1]}).should.be.rejectedWith(EVMThrow);
    });

    it("should throw when trying to invest more than hardcap", async function() {
        await skipPreIco();
        await icoContract.sendTransaction({value: HARD_CAP_ETHER + 1, from: accounts[1]}).should.be.rejectedWith(EVMThrow);
    });

    it("should allow reaching hardcap in one transaction", async function() {
        await skipPreIco();
        await icoContract.sendTransaction({value: HARD_CAP_ETHER, from: accounts[1]}).should.be.fulfilled;
    });

    it("should throw when trying to withdraw funds when ico is in progress", async function() {
        await skipPreIco();
        await icoContract.withdrawFunds().should.be.rejectedWith(EVMThrow);
    });

    it("should throw when trying to withdraw funds when sender's contribution is 0", async function() {
        await skipToEnd();
        await icoContract.withdrawFunds().should.be.rejectedWith(EVMThrow);
    });

    it("should throw when trying to send funds after ico has ended", async function() {
        await skipToEnd();
        await icoContract.sendTransaction({value: ONE_ETHER, from: accounts[0]}).should.be.rejectedWith(EVMThrow);
    });

    it("should throw when trying to finalize ico in progress", async function() {
        await icoContract.finalizeIco().should.be.rejectedWith(EVMThrow);
    });

    it("should throw when trying to finalize ico that hasn't reached the goal", async function() {
        await skipToEnd();
        await icoContract.finalizeIco().should.be.rejectedWith(EVMThrow);
    });

    it("should throw when trying to withdraw funds if ico has reached the goal", async function() {
        await skipPreIco();
        await icoContract.sendTransaction({value: SOFT_CAP_ETHER, from: accounts[1]});
        await skipToEnd();
        await icoContract.withdrawFunds({from: accounts[1]}).should.be.rejectedWith(EVMThrow);
    });

    it("should allow members to withdraw funds if ico hasn't reached the goal", async function() {
        await skipPreIco();
        let amountSent = new BigNumber(web3.toWei(100, "ether"));
        await icoContract.sendTransaction({value: amountSent, from: accounts[1]});
        await skipToEnd();
        let hasEnded = await icoContract.hasEnded.call();
        let softCapReached = await icoContract.softCapReached.call();
        hasEnded.should.equal(true);
        softCapReached.should.equal(false);

        let balanceBefore = await web3.eth.getBalance(accounts[1]);
        await icoContract.withdrawFunds({from: accounts[1]});
        let balanceAfter = await web3.eth.getBalance(accounts[1]);
        let amountWithdrawn = balanceAfter.toNumber() - balanceBefore.toNumber();
        (web3.fromWei(amountSent - amountWithdrawn, "ether")).should.be.bignumber.below(1);
    });

    it("should throw when trying to claim token with 0x0 address", async function() {
        await icoContract.claimTokens("0x0", {from: accounts[0]}).should.be.rejectedWith(EVMThrow);
    });

    it("should transfer claimed tokens to owner wallet", async function() {
        let newToken = await CromToken.new({from: accounts[1]});
        await newToken.transfer(icoContract.address, 100, {from: accounts[1]});
        await icoContract.claimTokens(newToken.address, {from: accounts[0]}).should.be.fulfilled;
        let balance = await newToken.balanceOf.call(targetWallet);
        balance.toNumber().should.be.bignumber.equal(100);
    });

    it("should transfer unsold tokens to target wallet", async function() {
        await skipPreIco();
        await icoContract.sendTransaction({value: SOFT_CAP_ETHER, from: accounts[1]});
        await skipToEnd();
        await icoContract.withdrawUnsoldTokens().should.be.fulfilled;
        let balance = await cromToken.balanceOf(targetWallet);
        balance.toNumber().should.be.bignumber.equal(5000000);
    });

    it("should throw when trying to withdraw unsold tokens before it end", async function() {
        await skipPreIco();
        await icoContract.withdrawUnsoldTokens().should.be.rejectedWith(EVMThrow);
    });

    it("should throw when trying to withdraw unsold tokens by non owner", async function() {
        await skipPreIco();
        await icoContract.withdrawUnsoldTokens({from: accounts[1]}).should.be.rejectedWith(EVMThrow);
    });

    it("should succesfully transfer the funds to targetWallet when all tokens are sold", async function() {
        let targetWalletInitialBalance = web3.eth.getBalance(targetWallet).toNumber();
        await skipPreIco();
        await icoContract.sendTransaction({value: HARD_CAP_ETHER, from: accounts[1]});
        await skipToEnd();
        await icoContract.finalizeIco().should.be.fulfilled;
        let unsoldTokens = await cromToken.balanceOf(targetWallet);
        unsoldTokens.toNumber().should.equal(0);
        (new BigNumber(web3.eth.getBalance(targetWallet).toNumber()) - targetWalletInitialBalance)
          .should.be.bignumber.equal(HARD_CAP_ETHER);
    });

    it("should transfer funds if softcap was reached", async function() {
      let targetWalletInitialBalance = new BigNumber(web3.eth.getBalance(targetWallet).toNumber());
      await skipPreIco();
      await icoContract.sendTransaction({value: SOFT_CAP_ETHER, from: accounts[1]});
      await skipToEnd();
      await icoContract.finalizeIco().should.be.fulfilled;
      (new BigNumber(web3.eth.getBalance(targetWallet).toNumber()).minus(targetWalletInitialBalance))
        .should.be.bignumber.equal(SOFT_CAP_ETHER);
    });

    it("should support pausing and resuming", async function() {
      await skipPreIco();
      await icoContract.pause();
      await icoContract.sendTransaction({value: SOFT_CAP_ETHER, from: accounts[1]}).should.be.rejectedWith(EVMThrow);
      await icoContract.resume();
      await icoContract.sendTransaction({value: SOFT_CAP_ETHER, from: accounts[1]}).should.be.fulfilled;
    });

    it("should throw when trying to resume in unpaused state", async function() {
      await icoContract.resume().should.be.rejectedWith(EVMThrow);
    });

    it("should throw when trying to pause in paused state", async function() {
      await icoContract.pause().should.be.fulfilled;
      await icoContract.pause().should.be.rejectedWith(EVMThrow);
    });

    it("should throw when trying to verify target wallet from a different address", async function() {
      await icoContract.changeTargetWallet(accounts[1]);
      await icoContract.verifyTargetWallet({from: accounts[0]}).should.be.rejectedWith(EVMThrow);
    });

    it("should allow changing target wallet", async function() {
      let originalWallet = await icoContract.targetWallet.call();
      await icoContract.changeTargetWallet(accounts[0]);
      let walletVerified = await icoContract.targetWalletVerified.call();
      let currentWallet = await icoContract.targetWallet.call();
      walletVerified.should.equal(false);
      currentWallet.valueOf().should.not.equal(originalWallet.valueOf());
      currentWallet.valueOf().should.equal(accounts[0]);
    });

    it("should use less than 130000 gas when sending funds", async function() {
      skipInTestCoverage(this);
      await skipPreIco();
      let transaction = await icoContract.sendTransaction({value: SOFT_CAP_ETHER, from: accounts[1]});
      let gasUsed = transaction.receipt.gasUsed;
      gasUsed.should.be.bignumber.below(130000);
    });

    it("should use less than 130000 gas when sending funds during pre ico", async function() {
      skipInTestCoverage(this);
      await icoContract.addPreIcoMembers([accounts[1]], {from: accounts[0]}).should.be.fulfilled;
      let transaction = await icoContract.sendTransaction({value: SOFT_CAP_ETHER, from: accounts[1]});
      let gasUsed = transaction.receipt.gasUsed;
      gasUsed.should.be.bignumber.below(130000);
    });
});
