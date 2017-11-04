#!/bin/bash

set -o errexit

trap cleanup EXIT

cleanup() {
  if [ -n "$testrpc_pid" ] && ps -p $testrpc_pid > /dev/null; then
    kill -9 $testrpc_pid
  fi
}

start_testrpc() {
  local accounts=(
    --account "0x0945b06d87f17032857d5312ca880031180b0a445a1facd24c30cc9643490e2d,1000000000000000000000000"
    --account "0x74b680dfe0bdc8aa525efcf530405fbe2243a5aecb8c25816c65db73579872b6,1000000000000000000000000"
    --account "0x74b680dfe0bdc8aa525efcf530405fbe2243a5aecb8c25816c65db73579872b7,1000000000000000000000000"
    --account "0x74b680dfe0bdc8aa525efcf530405fbe2243a5aecb8c25816c65db73579872b8,1000000000000000000"
  )

  if [ "$SOLIDITY_COVERAGE" = true ]; then
    ./node_modules/.bin/testrpc-sc --gasLimit 0xfffffffffff --port 8555 "${accounts[@]}" > /dev/null &
  else
    ./node_modules/.bin/testrpc "${accounts[@]}" > /dev/null &
  fi

  testrpc_pid=$!
}


start_testrpc
if [ "$SOLIDITY_COVERAGE" = true ]; then
  ./node_modules/.bin/solidity-coverage
else
  ./node_modules/.bin/truffle test
fi
