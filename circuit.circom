pragma circom 2.0.0;

include "node_modules/circomlib/circuits/sha256/sha256.circom";
include "QuinSelector.circom";
include "node_modules/circomlib/circuits/bitify.circom";


template VerifySpartanDark() {

    //DESIGNDEC reduced hash size from 256 to 16. We take the liberty of assuming that our blockchain is not getting attacked by external forces. So acc to the birthday paradox, a hash of size 64 bits should do just fine since our system is very small for now and only a few hashes are getting generated. Cite this reasoning in paper & during defense
    var HASH_LENGTH = 16;
    var MAX_CMLEDGER_LENGTH = HASH_LENGTH * 16;

    signal input cmLedgerSize;
    //signal input run;
    signal input cm[HASH_LENGTH];
    //signal input cm2[HASH_LENGTH];
    signal input hashValue[HASH_LENGTH];
    signal input k[HASH_LENGTH];
    signal input s[HASH_LENGTH];
    signal input positionOfCm;
    signal input cmLedger[MAX_CMLEDGER_LENGTH];
    signal input v1New;
    signal input v2New;
    signal input vOld;

    signal input rho[HASH_LENGTH];
    signal input addrPK[HASH_LENGTH];

    signal input snOld[HASH_LENGTH];
    signal input addrSK[HASH_LENGTH];
    //signal input rhoOld[HASH_LENGTH];

    // Check if value of new coins match that of the old coin
    vOld === v1New + v2New;

    //Check if addrSK is well formed
    component hashPK = Sha256(HASH_LENGTH * 2);
    for (var i = 0; i < HASH_LENGTH; i++) {
        hashPK.in[i] <== addrSK[i];
        hashPK.in[i + HASH_LENGTH] <== rho[i];
    }
    
    for (var i = 0; i < HASH_LENGTH; i++) {
        hashPK.out[i] === addrPK[i];
    }

    // Check if sn is well formed
    component hashSN = Sha256(HASH_LENGTH * 2);
    for (var i = 0; i < HASH_LENGTH; i++) {
        hashSN.in[i] <== addrSK[i];
        hashSN.in[i + HASH_LENGTH] <== cm[i];
    }
    
    for (var i = 0; i < HASH_LENGTH; i++) {
        hashSN.out[i] === snOld[i];
    }



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

}
component main {public [cmLedger, cmLedgerSize, snOld, addrPK]}= VerifySpartanDark();
