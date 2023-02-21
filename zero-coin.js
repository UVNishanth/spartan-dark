// COMPLETED

"use strict";

/* Basecoin for zk-spartan-cash.
Holds following info:
cm = coin commitment (hash)
v = value of coin
sn = coin serial no.
r = trapdoor generated for the coin. Also, the witness that the spender has to prove that
    they know the value of without revealing r
*/


class ZeroCoin {
    constructor(addrPK, v, rho, r, s, cm){
        this.cm = cm;
        this.v = v;
        this.rho = rho;
        this.r = r;
        this.s = s
        this.addrPK = addrPK;
    }
}

module.exports.ZeroCoin = ZeroCoin;