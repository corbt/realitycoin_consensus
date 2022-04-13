#! /bin/bash

set -eo pipefail

cd "$(dirname "$0")/.."

trap 'trap - SIGTERM && pkill -P $$' SIGINT SIGTERM EXIT

solana-test-validator &

anchor build && anchor deploy --provider.cluster localnet

sleep 99999999