function skipInTestCoverage(test) {
    if (typeof process.env["SOLIDITY_COVERAGE"] !== "undefined") {
        test.skip();
    }
}

export {skipInTestCoverage}
