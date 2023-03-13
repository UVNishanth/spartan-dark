// COMPLETED

"use strict";

const { utils } = require("spartan-gold");

/* Basecoin for zk-spartan-cash.
Holds following info:
cm = coin commitment (hash)
v = value of coin
sn = coin serial no.
r = trapdoor generated for the coin. Also, the witness that the spender has to prove that
    they know the value of without revealing r
*/


class SpartanZero {
    constructor(addrPK, v, hashedV, rho, r, s, cm){
        this.cm = cm;
        this.v = v;
        // also storing hash of value coz circuit standards
        this.hashedV = hashedV;
        this.rho = rho;
        this.r = r;
        this.s = s
        this.addrPK = addrPK;
    }
}

module.exports.SpartanZero = SpartanZero;