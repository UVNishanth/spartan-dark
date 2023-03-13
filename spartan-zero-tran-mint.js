//COMPLETED

"use strict";

const { utils } = require('spartan-gold');

//const { ZeroTransaction } = require('./zero-transaction.js');

// String constants mixed in before hashing.
const TX_CONST = "TX";

//ASK: what does hash in spartan gold utils return? String or Buffer. needed to confirm type of cms
/**
 * A mint transaction is required in the case of minitng new coin and is defined as a tuple (cm, v, *), where cm is a coin commitment, v is a coin value, and * is some extra information related to the transaction. Each transaction TranMint shows that a coin c with the coin commitment cm and the value v has been minted.
 * 
 * @param {Buffer} cm
 * @param {v} v
 * @param {Array} info
 */

// HIGHLIGHTS: does not require signing, verify sign etc like the og transaction as the transactions 
// are anonymous. So no sender validation reqd
class TranMint {

    constructor ({cm, v, hashv, k, s}){
        this.cm = cm;
        this.v = v;
        this.hashv = hashv;
        this.k = k;
        this.s = s;
    }

      /**
   * A transaction's ID is derived from its contents.
   * Fetched from spartan-gold src
   */

    // CITE: spartan-gold Transaction getID
    get id() {
        return utils.hash(TX_CONST + JSON.stringify({
        cm: this.cm,
        v: this.v,
        k: this.k,
        s: this.s
        // no transaction fee during minting reqd
        //fee: this.fee,
        }));
    }

}

module.exports.TranMint = TranMint;
