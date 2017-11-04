var CromToken = artifacts.require("./CromToken.sol");
var CromIco = artifacts.require("./CromIco.sol");

module.exports = function(deployer) {
  deployer.deploy(CromToken).then(function () {
    return deployer.deploy(CromIco, CromToken.address, web3.eth.accounts[0]).then(function() {
        return CromToken.deployed().then(function(cromToken) {
            return cromToken.transfer(CromIco.address, 6 * Math.pow(10, 6));
        });
    });
  });
};
