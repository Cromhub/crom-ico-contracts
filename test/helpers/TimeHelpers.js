function increaseTime(time) {
    return new Promise(function(resolve, reject) {
        web3.currentProvider.sendAsync({
            jsonrpc: "2.0",
            method: "evm_increaseTime",
            params: [time],
            id: new Date().getTime()
        }, function(err, result) {
            web3.currentProvider.sendAsync({
                jsonrpc: "2.0",
                method: "evm_mine",
                params: [],
                id: new Date().getTime()
            }, function() {
                resolve(true);
            });
        });
    });
}

function skipPreIco() {
    return increaseTime(60 * 60 * 24 * 8 * 2);
}

function skipToEnd() {
    return increaseTime(60 * 60 * 24 * 7 * 10);
}

export {skipPreIco, skipToEnd, increaseTime}
