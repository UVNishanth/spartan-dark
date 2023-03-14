"use strict";

const { Block, Blockchain, utils } = require("spartan-gold");

const SpartanZeroUtils = require("./spartan-zero-utils");

//HIGHLIGHTS: added cmLedger and snLedger
class SpartanZeroBlock extends Block {
  constructor(prevBlock) {
    super();

    this.prevBlockHash = prevBlock ? prevBlock.hashVal() : null;
    this.chainLength = prevBlock ? prevBlock.chainLength + 1 : 0;
    //this.target = target;

    this.snLedger = prevBlock ? prevBlock.snLedger : [];

    // TODO: using list for storing commits for now. change to merkle tree later
    this.cmLedger = prevBlock ? prevBlock.cmLedger : [];
    this.cmLedger.forEach((x) => {
      console.log(x);
    });
  }

  addTransaction(tx) {
    if (tx instanceof Blockchain.cfg.mintTransactionClass) {
      console.log("Current block props: ");
      for (let props in this) {
        console.log(props);
      }
      console.log("cmLedger is: ");
      console.log(this.cmLedger);

      //HACK: updating cmLedger by first checking if it already exists. hack due to duplication.
      // needs fix. try to use single miner. rewrite rerun in Block. in rerun the transactions
      // get added again by calling addTransactions. so that might be triggering the duplication.
      //if(!this.cmLedger.includes(Buffer(tx.cm))){
      if (!SpartanZeroUtils.bufferExistsInList(this.cmLedger, Buffer.from(tx.cm))) {
        this.cmLedger.push(Buffer.from(tx.cm));
      }
      this.transactions.set(tx.id, tx);
      return;
    }
    throw new Error("Transaction not of expected type");
  }

  //TODO: currently only handles TranMint. Handle TranPour as well
  /**
   * Verifies a transaction.
   *
   * @param {TranMint | TranPour} tx - The transaction to verify.
   * @returns {Boolean} - True if the transaction was valid, false otherwise.
   */
  async verifyTransaction(tx) {
    if (tx instanceof Blockchain.cfg.mintTransactionClass) {
      let hashv = Buffer.from(tx.hashv);
      let k = Buffer.from(tx.k);
      let s = Buffer.from(tx.s);
      //let stringS = tx.s.toString();
      let cm = Buffer.from(tx.cm);

      let cm0 = SpartanZeroUtils.comm(hashv, k, s);
      if (!cm.equals(cm0)) {
        console.log(
          "Commitment is incorrect. should be " + cm + " instead got " + cm0
        );
        return false;
      }
      console.log("Commitment is correct");
      return true;
    }
  }

  toJSON() {
    let o = super.toJSON();
    o.cmLedger = this.cmLedger;
    o.snLedger = this.snLedger;
    return o;
  }
}

module.exports.SpartanZeroBlock = SpartanZeroBlock;
