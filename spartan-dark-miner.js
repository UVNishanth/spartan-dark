"use strict";

let { SpartanDarkClient } = require('./spartan-dark-client.js');
let { SpartanDarkBlockchain } = require('./spartan-dark-blockchain.js');

let { Blockchain } = require('spartan-gold');

/**
 * Miners are clients, but they also mine blocks looking for "proofs".
 */
// BETTERCODE: most functions same as vanilla miner.
module.exports = class SpartanDarkMiner extends SpartanDarkClient {

  /**
   * When a new miner is created, but the PoW search is **not** yet started.
   * The initialize method kicks things off.
   * 
   * @constructor
   * @param {Object} obj - The properties of the client.
   * @param {String} [obj.name] - The miner's name, used for debugging messages.
   * * @param {Object} net - The network that the miner will use
   *      to send messages to all other clients.
   * @param {Block} [startingBlock] - The most recently ALREADY ACCEPTED block.
   * @param {Object} [obj.keyPair] - The public private keypair for the client.
   * @param {Number} [miningRounds] - The number of rounds a miner mines before checking
   *      for messages.  (In single-threaded mode with FakeNet, this parameter can
   *      simulate miners with more or less mining power.)
   */
  constructor({name, net, startingBlock, keyPair, miningRounds=SpartanDarkBlockchain.NUM_ROUNDS_MINING} = {}) {
    super({name, net, startingBlock, keyPair});
    this.miningRounds=miningRounds;

    // Set of transactions to be added to the next block.
    this.transactions = new Set();
  }

  /**
   * Starts listeners and begins mining.
   */
  initialize() {
    this.startNewSearch();

    this.on(SpartanDarkBlockchain.START_MINING, this.findProof);
    this.on(SpartanDarkBlockchain.POST_TRANSACTION, this.addTransaction);

    setTimeout(() => this.emit(SpartanDarkBlockchain.START_MINING), 0);
  }

  /**
   * Sets up the miner to start searching for a new block.
   * 
   * @param {Set} [txSet] - Transactions the miner has that have not been accepted yet.
   */
  startNewSearch(txSet=new Set()) {
    this.currentBlock = Blockchain.makeBlock(this.lastBlock);

    // for(let prop in this.currentBlock){
    //   console.log("Block props: "+prop);
    // }

    // Merging txSet into the transaction queue.
    // These transactions may include transactions not already included
    // by a recently received block, but that the miner is aware of.
    txSet.forEach((tx) => this.transactions.add(tx));

    // console.log("Checking miner's block type: ");
    // for(let props in this.currentBlock){
    //   console.log(props);
    // }
    // Add queued-up transactions to block.
    this.transactions.forEach((tx) => {
      this.currentBlock.addTransaction(tx);
    });
    this.transactions.clear();

    // this.currentBlock.cmLedger.forEach((x)=>{
    //   console.log(x);
    // });

    // Start looking for a proof at 0.
    this.currentBlock.proof = 0;
  }

  /**
   * Looks for a "proof".  It breaks after some time to listen for messages.  (We need
   * to do this since JS does not support concurrency).
   * 
   * The 'oneAndDone' field is used for testing only; it prevents the findProof method
   * from looking for the proof again after the first attempt.
   * 
   * @param {boolean} oneAndDone - Give up after the first PoW search (testing only).
   */
  findProof(oneAndDone=false) {
    let pausePoint = this.currentBlock.proof + this.miningRounds;
    while (this.currentBlock.proof < pausePoint) {
      if (this.currentBlock.hasValidProof()) {
        this.log(`found proof for block ${this.currentBlock.chainLength}: ${this.currentBlock.proof}`);
        this.announceProof();
        // Note: calling receiveBlock triggers a new search.
        this.receiveBlock(this.currentBlock);
        break;
      }
      this.currentBlock.proof++;
    }
    // If we are testing, don't continue the search.
    if (!oneAndDone) {
      // Check if anyone has found a block, and then return to mining.
      setTimeout(() => this.emit(SpartanDarkBlockchain.START_MINING), 0);
    }
  }

  /**
   * Broadcast the block, with a valid proof included.
   */
  announceProof() {
    this.net.broadcast(SpartanDarkBlockchain.PROOF_FOUND, this.currentBlock);
  }

  /**
   * Receives a block from another miner. If it is valid,
   * the block will be stored. If it is also a longer chain,
   * the miner will accept it and replace the currentBlock.
   * 
   * @param {Block | Object} b - The block
   */
  receiveBlock(s) {
    let b = super.receiveBlock(s);
    //console.log("receive block triggered for: "+this.name);
    // for(let prop in s){
    //   console.log(prop);
    // }
    
    if (b === null) return null;

    //b.cmLedger = s.cmLedger;

    // We switch over to the new chain only if it is better.
    if (this.currentBlock && b.chainLength >= this.currentBlock.chainLength) {
      this.log(`cutting over to new chain.`);
      let txSet = this.syncTransactions(b);
      this.startNewSearch(txSet);
    }

    return b;
  }

  /**
   * This function should determine what transactions
   * need to be added or deleted.  It should find a common ancestor (retrieving
   * any transactions from the rolled-back blocks), remove any transactions
   * already included in the newly accepted blocks, and add any remaining
   * transactions to the new block.
   * 
   * @param {Block} nb - The newly accepted block.
   * 
   * @returns {Set} - The set of transactions that have not yet been accepted by the new block.
   */
  syncTransactions(nb) {
    let cb = this.currentBlock;
    let cbTxs = new Set();
    let nbTxs = new Set();

    // The new block may be ahead of the old block.  We roll back the new chain
    // to the matching height, collecting any transactions.
    while (nb.chainLength > cb.chainLength) {
      nb.transactions.forEach((tx) => nbTxs.add(tx));
      nb = this.blocks.get(nb.prevBlockHash);
    }

    // Step back in sync until we hit the common ancestor.
    while (cb && cb.id !== nb.id) {
      // Store any transactions in the two chains.
      cb.transactions.forEach((tx) => cbTxs.add(tx));
      nb.transactions.forEach((tx) => nbTxs.add(tx));

      cb = this.blocks.get(cb.prevBlockHash);
      nb = this.blocks.get(nb.prevBlockHash);
    }

    // Remove all transactions that the new chain already has.
    nbTxs.forEach((tx) => cbTxs.delete(tx));

    return cbTxs;
  }

  /**
   * Returns false if transaction is not accepted. Otherwise stores
   * the transaction to be added to the next block.
   * 
   * @param {Transaction | String} tx - The transaction to add.
   */
  async addTransaction(tx) {
    let startTime = performance.now();
    tx = SpartanDarkBlockchain.deserializeTransaction(tx);
    let res = await this.currentBlock.verifyTransaction(tx);
    if (res){
        this.log("Transaction verified, adding it to the current block");
        this.currentBlock.addTransaction(tx);
        //this.currentBlock.cmLedger.push(tx.cm);
    }
    let endTime = performance.now();
    console.log(`Execution time of verification is: ${endTime - startTime} ms`);
  }

  /**
   * When a miner posts a transaction, it must also add it to its current list of transactions.
   *
   * @param  {...any} args - Arguments needed for Client.postTransaction.
   */
  postTransaction(...args) {
    let tx = super.postTransaction(...args);
    return this.addTransaction(tx);
  }

};
