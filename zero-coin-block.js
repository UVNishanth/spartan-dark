"use strict";

const { Block, Blockchain,utils } = require('spartan-gold');

//HIGHLIGHTS: added cmLedger and snLedger
class ZeroCoinBlock extends Block{

  constructor(prevBlock){
      super();

      this.prevBlockHash = prevBlock ? prevBlock.hashVal() : null;
      this.chainLength = prevBlock ? prevBlock.chainLength+1 : 0;
      //this.target = target;
      
      this.snLedger = prevBlock ? prevBlock.snLedger : [];

      // TODO: using list for storing commits for now. change to merkle tree later
      this.cmLedger = prevBlock ? prevBlock.cmLedger : [];
      console.log("New Block cmLedger: ");
      this.cmLedger.forEach((x) => {
        console.log(x);
      });
  }

  addTransaction(tx) {
    if (tx instanceof Blockchain.cfg.mintTransactionClass){
      console.log("Current block props: ");
      for(let props in this){
        console.log(props);
      }
      console.log("cmLedger is: "+this.cmLedger);
      
      //HACK: updating cmLedger by first checking if it already exists. hack due to duplication. 
      // needs fix. try to use single miner. rewrite rerun in Block. in rerun the transactions
      // get added again by calling addTransactions. so that might be triggering the duplication.
      if(!this.cmLedger.includes(tx.cm)){
        this.cmLedger.push(tx.cm);
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
    if (tx instanceof Blockchain.cfg.mintTransactionClass){
      let v = tx.v;
      let k = tx.k;
      let s = tx.s;
      let cm = tx.cm;

      let cm0 = utils.hash(v + k + s+'');
      if (cm0 !=  cm){
        return false;
      }
      console.log("Commitment is correct");
      return true;
  }

  }

}

module.exports.ZeroCoinBlock = ZeroCoinBlock;