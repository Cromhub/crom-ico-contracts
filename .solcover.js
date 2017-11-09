module.exports = {
    norpc: true,
    copyNodeModules: true,
    testCommand: './node_modules/.bin/truffle test --network coverage',
    skipFiles: ['MultiSigWallet.sol']
}
