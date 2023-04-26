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

class SpartanDark {
  constructor(addrPK, v, hashedV, rho, r, s, cm, k) {
    this.cm = Buffer.from(cm);
    this.v = v;
    // also storing hash of value coz circuit standards
    this.hashedV = Buffer.from(hashedV);
    this.rho = Buffer.from(rho);
    this.r = Buffer.from(r);
    (this.s = Buffer.from(s)), (this.addrPK = addrPK);
    this.k = k;
  }

  toBuffer() {
    let byteV = [];
    byteV[1] = this.v & 255;
    byteV[0] = (this.v >> 8) & 255;
    let mintedCoinData = [
        this.addrPK,
        this.cm,
        this.hashedV,
        this.k,
        this.r,
        this.rho,
        this.s,
        Buffer.from(byteV)
      ];
    return Buffer.concat(mintedCoinData);
  }
}

module.exports.SpartanDark = SpartanDark;
