pragma circom 2.0.0;

include "node_modules/circomlib/circuits/sha256/sha256.circom";


template VerifySpartanZero() {

    //DESIGNDEC reduced hash size from 256 to 64. We take the liberty of assuming that our blockchain is not getting attacked by external forces. So acc to the birthday paradox, a hash of size 64 bits should do just fine since our system is very small for now and only a few hashes are getting generated. Cite this reasoning in paper & during defense
    var HASH_LENGTH = 64;

    signal input cm[HASH_LENGTH];
    signal input hashValue[HASH_LENGTH];
    signal input k[HASH_LENGTH];
    signal input s[HASH_LENGTH];

    //signal output out;


    component hash = Sha256(HASH_LENGTH * 3);
    for (var i = 0; i < HASH_LENGTH; i++) {
        hash.in[i] <== hashValue[i];
        hash.in[i + HASH_LENGTH] <== k[i];
        hash.in[i + HASH_LENGTH + HASH_LENGTH] <== s[i];
    }
    
    for (var i = 0; i < HASH_LENGTH; i++) {
        hash.out[i] === cm[i];
    }

    //out <== cm[0];

}
component main {public [hashValue, k, s]}= VerifySpartanZero();