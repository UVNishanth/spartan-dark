//COMPLETED

"use strict";

const { utils } = require("spartan-gold");

const { Sign } = require("crypto");

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
 * @param {Sign} sigma stores sign used for verification of a TranPour
 */

// HIGHLIGHTS: does not require signing, verify sign etc like the og transaction as the transactions
// are anonymous. So no sender validation reqd
class TranPour {
  constructor({ sn, cm1New, cm2New, pkSig, h, proof, encTran1Id, encTran2Id }) {
    this.sn = sn;
    this.cm1New = Buffer.from(cm1New);
    this.cm2New = Buffer.from(cm2New);
    this.pkSig = pkSig;
    this.h = h;
    this.proof = proof;
    this.encTran1Id = encTran1Id;
    this.encTran2Id = encTran2Id;
  }

  /**
   * A transaction's ID is derived from its contents.
   * Fetched from spartan-gold src
   */

  // CITE: spartan-gold Transaction getID
  get id() {
    return utils.hash(
      TX_CONST +
        JSON.stringify({
          sn: this.sn,
          cm1New: this.cm1New,
          cm2New: this.cm2New,
          pkSig: this.pkSig,
          h: this.h,
          proof: this.proof,
          encTran1Id : this.encTran1Id,
          encTran2Id : this.encTran2Id
          // no transaction fee during minting reqd
          //fee: this.fee,
        })
    );
  }
}

module.exports.TranPour = TranPour;
