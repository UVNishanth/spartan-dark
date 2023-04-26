#!/bin/bash
$HOME/.cargo/bin/circom $1 --r1cs --wasm --sym
snarkjs groth16 setup circuit.r1cs pot17_final.ptau circuit_0000.zkey
snarkjs zkey contribute circuit_0000.zkey circuit_0001.zkey --name="1st Contributor Name" -v -e="hellfire"
snarkjs zkey verify circuit.r1cs pot17_final.ptau circuit_0001.zkey
snarkjs zkey beacon circuit_0001.zkey circuit_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"
snarkjs zkey verify circuit.r1cs pot17_final.ptau circuit_final.zkey
snarkjs zkey export verificationkey circuit_final.zkey verification_key.json


# move wasm from circuit_js folder to curr dir
mv circuit_js/circuit.wasm .