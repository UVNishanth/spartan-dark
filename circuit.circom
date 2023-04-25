pragma circom 2.0.0;

include "node_modules/circomlib/circuits/sha256/sha256.circom";
include "QuinSelector.circom";
include "node_modules/circomlib/circuits/bitify.circom";


template VerifySpartanDark() {

    //DESIGNDEC reduced hash size from 256 to 16. We take the liberty of assuming that our blockchain is not getting attacked by external forces. So acc to the birthday paradox, a hash of size 64 bits should do just fine since our system is very small for now and only a few hashes are getting generated. Cite this reasoning in paper & during defense
    var HASH_LENGTH = 16;
    var MAX_CMLEDGER_LENGTH = HASH_LENGTH * 16;

    signal input cmLedgerSize;
    signal input run;
    signal input cm[HASH_LENGTH];
    signal input cm2[HASH_LENGTH];
    signal input hashValue[HASH_LENGTH];
    signal input k[HASH_LENGTH];
    signal input s[HASH_LENGTH];
    signal input positionOfCm;
    signal input cmLedger[MAX_CMLEDGER_LENGTH];
    signal input v1New;
    signal input v2New;
    signal input vOld;

    //signal input sn[HASH_LENGTH];
    //signal input addrSK[HASH_LENGTH];
    //signal input rho[HASH_LENGTH];


    signal output temp[HASH_LENGTH];

    // Check if value of new coins match that of the old coin
    vOld === v1New + v2New;

    // Check if spender knows the cm of spending coin
    component hash = Sha256(HASH_LENGTH * 3);
    for (var i = 0; i < HASH_LENGTH; i++) {
        hash.in[i] <== hashValue[i];
        hash.in[i + HASH_LENGTH] <== k[i];
        hash.in[i + HASH_LENGTH + HASH_LENGTH] <== s[i];
    }
    
    for (var i = 0; i < HASH_LENGTH; i++) {
        hash.out[i] === cm[i];
    }

    
    // Check if cm of spending coin is in the cmLedger
    component quinSelector[HASH_LENGTH];

    var start = positionOfCm * HASH_LENGTH;
    for(var x = 0; x < HASH_LENGTH; x++) {
        quinSelector[x] = QuinSelector(MAX_CMLEDGER_LENGTH);
        for (var y = 0; y < MAX_CMLEDGER_LENGTH; y++) {
            quinSelector[x].in[y] <== cmLedger[y];
        }
        quinSelector[x].index <== start+x;
        cm[x] === quinSelector[x].out;
    }

    component hash2 = Sha256(HASH_LENGTH * 3);

    //check for cm2 if it exists
    for (var i = 0; i < HASH_LENGTH; i++) {
        hash2.in[i] <== hashValue[i];
        hash2.in[i + HASH_LENGTH] <== k[i];
        hash2.in[i + HASH_LENGTH + HASH_LENGTH] <== s[i];
    }
    
    // Check if cm of spending coin is in the cmLedger
    for (var i = 0; i < HASH_LENGTH; i++) {
        temp[i] <== (hash2.out[i] * (1 - run));
        hash2.out[i] === (cm[i]*run) + temp[i];
    }

}
component main {public [cmLedger, cmLedgerSize, hashValue, sn]}= VerifySpartanDark();
