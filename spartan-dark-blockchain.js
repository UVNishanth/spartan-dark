"use strict";

// Network message constants
const MISSING_BLOCK = "MISSING_BLOCK";
const POST_TRANSACTION = "POST_TRANSACTION";
const RECEIVE_TRANSACTION = "RECEIVE_TRANSACTION"
const PROOF_FOUND = "PROOF_FOUND";
const START_MINING = "START_MINING";
const MAX_CM_LEDGER_BITS = 256;

// Constants for mining
const NUM_ROUNDS_MINING = 2000;

// Constants related to proof-of-work target
const POW_BASE_TARGET = BigInt(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
);
const POW_LEADING_ZEROES = 15;

// Constants for mining rewards and default transaction fees
const COINBASE_AMT_ALLOWED = 25;
const DEFAULT_TX_FEE = 1;

// If a block is 6 blocks older than the current block, it is considered
// confirmed, for no better reason than that is what Bitcoin does.
// Note that the genesis block is always considered to be confirmed.
const CONFIRMED_DEPTH = 6;

const { Blockchain } = require("spartan-gold");

const { SpartanDarkBlock } = require("./spartan-dark-block");

//HIGHLIGHTS: setting new TransactionClasses
class SpartanDarkBlockchain extends Blockchain {
  static makeGenesis(cfg) {
    // let supercfg = Object.assign({}, cfg);
    // delete supercfg.mintTransactionClass;
    // delete supercfg.pourTransactionClass;
    let block = super.makeGenesis(cfg);

    block.snLedger = [];
    block.cmLedger = [];

    //SpartanDarkBlockchain.pourTransactions

    console.log("genesis: " + block.isGenesisBlock());
    //throw new Error();

    // settign genesis again after super so that blocktype for clients is
    // ZerCoinBlock and not just Block
    if (cfg.clientBalanceMap) {
      for (let client of cfg.clientBalanceMap.keys()) {
        client.lastBlock = null;
        client.setGenesisBlock(block);
      }
    }

    SpartanDarkBlockchain.cfg.mintTransactionClass = cfg.mintTransactionClass;
    SpartanDarkBlockchain.cfg.pourTransactionClass = cfg.pourTransactionClass;
    // for (let prop in Blockchain.cfg) {
    //   console.log(prop + ": " + Blockchain.cfg.prop);
    // }
    //throw new Error();
    //FileSystem.
    return block;
  }
  static makeTransaction(o) {
    if (
      o instanceof SpartanDarkBlockchain.cfg.mintTransactionClass ||
      o instanceof SpartanDarkBlockchain.cfg.pourTransactionClass
    ) {
      return o;
    }
    //BETTERCODE: setting class based on object property
    if (Object.hasOwn(o, "sn")) {
      return new SpartanDarkBlockchain.cfg.pourTransactionClass(o);
    }
    return new SpartanDarkBlockchain.cfg.mintTransactionClass(o);
  }

  /**
   * Converts a string representation of a block to a new Block instance.
   *
   * @param {Object} o - An object representing a block, but not necessarily an instance of Block.
   *
   * @returns {SpartanDarkBlock}
   */
  static deserializeBlock(o) {
    if (o instanceof SpartanDarkBlockchain.cfg.blockClass) {
      //console.log("already a block");
      return o;
    }

    let block = new SpartanDarkBlockchain.cfg.blockClass();
    block.chainLength = parseInt(o.chainLength, 10);
    block.timestamp = o.timestamp;
    block.prevBlockHash = o.prevBlockHash;
    block.proof = o.proof;
    block.transactions = new Map();
    if (o.transactions)
      o.transactions.forEach(([txID, txJson]) => {
        let tx = this.deserializeTransaction(txJson);
        block.transactions.set(tx.id, tx);
      });

    //ISSUEFIXED: 
    //BUG: have hardcoded snLedger and cmLedger as there was error coz o didn't have them. ask why so
    //block.snLedger = [];
    for (let i = 0; i < o.snLedger.length; i++) {
      block.snLedger.push(o.snLedger[i]);
    }
    //block.cmLedger = [];
    // for (let i = 0; i < o.cmLedger.length; i++) {
    //   block.cmLedger.push(Buffer.from(o.cmLedger[i]));
    // }

    for (let i = 0; i < o.cmLedger.length; i++) {
      block.cmLedger.push(o.cmLedger[i]);
    }

    return block;
  }

  /**
   * Converts a string representation of a transaction to a new Transaction instance.
   *
   * @param {Object} o - An object representing a transaction, but not necessarily an instance of transaction.
   *
   * @returns {SpartanDarkTransaction}
   */
  static deserializeTransaction(o) {
    if (
      o instanceof SpartanDarkBlockchain.cfg.mintTransactionClass ||
      o instanceof SpartanDarkBlockchain.cfg.pourTransactionClass
    ) {
      return o;
    }

    //BETTERCODE: setting class based on object property
    if (Object.hasOwn(o, "sn")) {
      //console.log("Pour Transaction found!!!!!!");
      return new SpartanDarkBlockchain.cfg.pourTransactionClass(o);
    }
    return new SpartanDarkBlockchain.cfg.mintTransactionClass(o);
  }
}

module.exports.SpartanDarkBlockchain = SpartanDarkBlockchain;
