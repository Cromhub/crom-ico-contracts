var MultiSigWallet = artifacts.require("./MultiSigWallet.sol");
var CromToken = artifacts.require("./CromToken.sol");
var CromIco = artifacts.require("./CromIco.sol");

module.exports = function(deployer) {
  deployer.deploy(MultiSigWallet, [web3.eth.accounts[0]], 1).then(function() {
    return deployer.deploy(CromToken).then(function () {
      return deployer.deploy(CromIco, CromToken.address, MultiSigWallet.address).then(function() {
        return CromToken.deployed().then(function(cromToken) {
          return cromToken.transfer(CromIco.address, 6 * Math.pow(10, 6));
        });
      });
    });
  });
};
