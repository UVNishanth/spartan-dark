"use strict";

const { Client, utils } = require("spartan-gold");
const snarkjs = require("snarkjs");
const fs = require("fs");
const { SpartanDarkBlockchain } = require("./spartan-dark-blockchain.js");
const { SpartanDark } = require("./spartan-dark.js");
const SpartanDarkUtils = require("./spartan-dark-utils.js");
const { TranMint } = require("./spartan-dark-tran-mint.js");
const { TranPour } = require("./spartan-dark-tran-pour.js");

//TODO: add functionality to mint new coins after initializing blockchain makeGenesis so that
// the associated balance is converted into coins which the client cna then spend. Which can then be
// used to determine whether the client has enough funds to mint a coin of specified value and hence
// avoiding generation of coins out of thin air
/**
 * A SpartanDarkClient is capable of minting coins and sending/receiving minted coins
 */
class SpartanDarkClient extends Client {
  #privDecKey;
  //CITE: spartan-gold's Client class description
  /**
   * The net object determines how the client communicates
   * with other entities in the system. (This approach allows us to
   * simplify our testing setup.)
   *
   * @constructor
   * @param {Object} obj - The properties of the client.
   * @param {String} [obj.name] - The client's name, used for debugging messages.
   * @param {Object} obj.net - The network used by the client
   *    to send messages to all miners and clients.
   * @param {Block} [obj.startingBlock] - The starting point of the blockchain for the client.
   */
  constructor({ name, net, startingBlock } = {}) {
    super({ name, net, startingBlock });

    // SpartanDarks = (value, coin) []
    //DESIGNDEC: changing dict of cm -> coin to list of tuples (value, coin) coz list easier to sort than dict
    this.SpartanDarks = [];
    this.on(SpartanDarkBlockchain.PROOF_FOUND, this.receiveBlock);
    this.on(SpartanDarkBlockchain.RECEIVE_TRANSACTION, this.receiveTransaction);

    // DESIGNDEC: used to see if coin due to receive has been found. using a map rather than a single bool val coz might happen that receiver is looking for multiple coins so to keep track of all coins
    this.coinFound = new Map();

    // to maintain public-private keys relationship even when new address is generated
    this.addressBindings = {};

    this.generateNewAddress();

    this.generateEncDecKeyPair();
  }

  // ASK: Make sure the client has enough gold.
  // Cannot calculate as you cannot update availableGold as
  // u don't know whether ur mint transaction will be accepted
  // ask prof how u can validate if client has enough funds
  /**
   * User can create new coins of desired value and let everyone know about this by registering
   * a correpsonding TranMint
   *
   * @param {number} value - The value of coin that the user wants to mint
   * @returns {TranMint} - The generated mint transaction
   */

  mint(value) {
    let mintedCoin = SpartanDarkUtils.createNewSpartanDark(this, value);
    let cm = Buffer.from(mintedCoin.cm);

    //this.SpartanDarks.push(mintedCoin);
    //BETTERCODE: currently sorting using comparator after adding. Change so that element gets added into a sorted list and sorts itself during insertion

    // this.SpartanDarks.push([value, mintedCoin]);
    // console.log("After push: ");
    // console.log(this.SpartanDarks + "\n\n");
    // this.SpartanDarks.sort(SpartanDarkUtils.OrderSpartanDark);
    this.SpartanDarks = SpartanDarkUtils.addSpartanDarkWithValueToWallet(
      this.SpartanDarks,
      mintedCoin
    );
    // console.log("CM for newly minted coin: ");
    // console.log(cm);

    // Create and broadcast the transaction.
    this.postGenericTransaction({
      cm: mintedCoin.cm,
      v: mintedCoin.v,
      hashv: mintedCoin.hashedV,
      k: mintedCoin.k,
      s: mintedCoin.s,
    });
  }

  /**
   * Broadcasts a mint transaction from the client.  No validation is performed,
   * so the transaction might be rejected by other miners.
   *
   *
   * @param {Object} mintTxData - The key-value pairs of the mint transaction.
   *
   * @returns {TranMint} - The generated mint transaction
   */
  // postMintTransaction(mintTxData) {
  //   let tx = new TranMint(mintTxData);

  //   //HIGHLIGHTS: Don't need to sign transaction unlike in original
  //   //tx.sign(this.keyPair.private);

  //   // Adding transaction to pending.
  //   this.pendingOutgoingTransactions.set(tx.id, tx);

  //   //HIGHLIGHTS: nonce isn't utilized
  //   //this.nonce++;

  //   this.net.broadcast(SpartanDarkBlockchain.POST_TRANSACTION, tx);

  //   return tx;
  // }

  postGenericTransaction(txData) {
    // Creating a transaction, with defaults for the
    // from, nonce, and pubKey fields.
    let tx;
    if (Object.hasOwn(txData, "sn")) {
      tx = new TranPour(txData);
    }
    //console.log("Am here now");
    else {
      tx = new TranMint(txData);
    }

    //HIGHLIGHTS: Don't need to sign transaction unlike in original
    //tx.sign(this.keyPair.private);

    // Adding transaction to pending.
    this.pendingOutgoingTransactions.set(tx.id, tx);

    //HIGHLIGHTS: nonce isn't utilized
    //this.nonce++;

    this.net.broadcast(SpartanDarkBlockchain.POST_TRANSACTION, tx);

    return tx;
  }

  /**
   *
   * @param {SpartanDarkClient} receiver
   * @param {Number} amount
   */
  async spend(receiver, amount) {
    //DESIGNDEC: Doing a check also gives a side-effect of checking if a coin-change added by the spender previously has been committed to the ledger successfully and in turn also updates the balance accordingly
    let currBalance = this.getBalance();
    if (currBalance < amount) {
      throw new Error(
        "Not enough balance to pay. Curr Balance: " + currBalance
      );
    }

    let oldSpartanDark = SpartanDarkUtils.findAppropSpartanDark(
      this.SpartanDarks,
      amount
    );

    this.SpartanDarks = this.SpartanDarks.filter((entry) => {
      let coin = entry[1];
      return coin.cm !== oldSpartanDark.cm;
    });

    let rhoOld = oldSpartanDark.rho;
    // get addrSK of old coin
    let addrSKOld = this.addressBindings[oldSpartanDark.addrPK];
    let snOld = SpartanDarkUtils.prf(rhoOld, SpartanDarkUtils.SN, addrSKOld);
    //let recvAddr = receiver.address;

    // the amount the spender needs to get back after spending the requd amount
    let change = oldSpartanDark.v - amount;
    let coinToSpend = SpartanDarkUtils.createNewSpartanDark(receiver, amount);
    // remaining amount spender needs to send back to themselves
    let coinChange = SpartanDarkUtils.createNewSpartanDark(this, change);

    // client needs to get back coinChange. so we can store coinChange in client's list and then check if transaction got validated while doing getBalance()
    //this.SpartanDarks.push([change, coinChange]);
    this.SpartanDarks = SpartanDarkUtils.addSpartanDarkWithValueToWallet(
      this.SpartanDarks,
      coinChange
    );
    // console.log("After getting back change: ");
    // console.log(this.SpartanDarks);
    // console.log("\n\n");
    this.SpartanDarks.sort(SpartanDarkUtils.OrderSpartanDark);

    const sigKeys = SpartanDarkUtils.generateKeypair();
    let pkSig = sigKeys.public;
    let skSig = sigKeys.private;
    let hSig = SpartanDarkUtils.hash(pkSig);
    let h_ = SpartanDarkUtils.prf(hSig, SpartanDarkUtils.PK, addrSKOld);
    let cmOldInBase64 = oldSpartanDark.cm.toString('base64');
    let cmLedger = this.lastConfirmedBlock.cmLedger;
    let cmOldPositionInLedger = cmLedger.findIndex((x) => x === cmOldInBase64);
    let cmLedgerSize = cmLedger.length;
    let bufferCmLedger = [];
    for (let cm of cmLedger) {
      bufferCmLedger.push(Buffer.from(cm, "base64"));
    }
    //bufferCmLedger = Buffer.from(bufferCmLedger);
    let cmLedgerArray = [];
    for (let cmBuffer of bufferCmLedger) {
      let cmBitArray = SpartanDarkUtils.bufferToBitArray(cmBuffer);
      for (let x of cmBitArray) {
        cmLedgerArray.push(x);
      }
    }
    let paddingBits = (SpartanDarkUtils.CMLEDGER_MAXSIZE * (SpartanDarkUtils.BYTE_SIZE * 8)) - (cmLedgerSize*(SpartanDarkUtils.BYTE_SIZE * 8));
    for(let i=0; i < paddingBits; i++){
      cmLedgerArray.push(0);
    }
    //let cmLedgerArray = SpartanDarkUtils.bufferToBitArray(bufferCmLedger);
    let circuitInput = {
      k: SpartanDarkUtils.bufferToBitArray(
        SpartanDarkUtils.comm(
          SpartanDarkUtils.hash(oldSpartanDark.addrPK),
          oldSpartanDark.r,
          oldSpartanDark.rho
        )
      ),

      hashValue: SpartanDarkUtils.bufferToBitArray(oldSpartanDark.hashedV),
      s: SpartanDarkUtils.bufferToBitArray(oldSpartanDark.s),
      cm: SpartanDarkUtils.bufferToBitArray(oldSpartanDark.cm),
      cmLedger: cmLedgerArray,
      cmLedgerSize : cmLedgerSize,
      positionOfCm : cmOldPositionInLedger,
      v1New : coinToSpend.v,
      v2New : coinChange.v,
      vOld : oldSpartanDark.v
    };

    let proofPacket = await snarkjs.groth16.fullProve(
      circuitInput,
      "circuit.wasm",
      "circuit_final.zkey"
    );

    // console.log("For pour: generated 2 new coins of cm: ");
    // console.log(coinToSpend.cm);
    // console.log(coinChange.cm);

    let tx = this.postGenericTransaction({
      sn: snOld,
      cm1New: coinToSpend.cm,
      cm2New: coinChange.cm,
      proof: proofPacket,
      //TODO: Generate proper sigma. now using placeholder as we aren't using it for now
    });

    //Send notification to receiver to check for pour transaction on the ledger
    //DESIGNDEC: Sending coin alongwith notification so that the receiver can only check if the pourT id sent is present on the ledger and if yes, put that coin in its wallet. So our enc dec logic becomes redundant as the receiver already has the coin and does not need to decrypt anything from the pour transaction. Simplifying the actual logic of zerocash
    this.net.sendMessage(
      receiver.address,
      SpartanDarkBlockchain.RECEIVE_TRANSACTION,
      {
        cm: Buffer.from(coinToSpend.cm),
        coin: coinToSpend,
      }
    );
    // this.net.sendMessage(
    //   this.address,
    //   SpartanDarkBlockchain.RECEIVE_TRANSACTION,
    //   {
    //     txId: tx.id,
    //     coin: coinChange,
    //   }
    // );
  }

  //TODO: implement
  //ASK: when to trigger
  /**
   * Client needs to periodically perform a recieveTransaction in in order to look for due payments.
   * Does not post anything. Just scours the transactionList to look for a new transaction that belong
   * to them.
   *
   *
   *
   * @param
   *
   * @returns
   */

  async receiveTransaction(msgInfo) {
    let coin = msgInfo.coin;
    let cm = msgInfo.cm;
    // /this.coinFound.set(cmHash, false);
    //DESIGNDEC: even tho receieveTransation is triggered immediately after spender spends the coin, due to latency of proof generation, the coin might not be on the ledger immediately. So we run the findcoin function (inside the setIntervals) periodically till the coin is found. Can add a timeout to let the reciever know that spender's transaction has been invalidated (easy way to implement is to keep a cmRejectedLedger in block and also check lastblock's cmRejectedLedger to see if the coin was rejected)
    let timerId = setInterval(() => {
      if (this.checkIfCmInLedger(cm)) {
        console.log("Transaction Found by Receiver!!!!!!");
        this.SpartanDarks = SpartanDarkUtils.addSpartanDarkWithValueToWallet(
          this.SpartanDarks,
          coin
        );
        clearInterval(timerId);
      }
    }, 5000);
    // /return;
  }

  checkIfCmInLedger(cm) {
    let lastBlock = this.lastConfirmedBlock;
    // console.log("I am " + this.name);
    // console.log("Last Block Ledger");
    // console.log(lastBlock.cmLedger);
    let cmString = Buffer.from(cm).toString("base64");
    // console.log("hash to compare");
    // console.log(cmString);
    // if (
    //   SpartanDarkUtils.bufferExistsInList(
    //     this.lastConfirmedBlock.cmLedger,
    //     Buffer.from(cm)
    //   )
    if (lastBlock.cmLedger.includes(cmString)) {
      return true;
    }
    return false;
  }

  // receiveTransactionLogic(msgInfo) {
  //   //console.log("Received triggered for " + this.name);
  //   //console.log(this.name+" is try");
  //   let txId = msgInfo.txId;
  //   let coin = msgInfo.coin;

  //   let COIN_NOT_FOUND = true;
  //   //let blockWhereTransExist;
    // while (COIN_NOT_FOUND) {
    //   console.log(this.name + " is finding the blocks again");
    //   // for (let index = this.blocks.size-1; index >= 0; index--) {
    //   //   let currBlock = SpartanDarkUtils.getMapValueAtIndex(this.blocks, index);
    //   //   if (currBlock.transactions.has(txId)) {
    //   //     console.log("Transaction Found by Receiver!!!!!!");
    //   //     COIN_NOT_FOUND = false;
    //   //     break;
    //   //   }
    //   //   if (!COIN_NOT_FOUND){
    //   //     break;
    //   //   }
    //   // }
    //   let lastBlock = this.lastConfirmedBlock;
    //   if (lastBlock.transactions.has(txId)) {
    //         console.log("Transaction Found by Receiver!!!!!!");
    //         COIN_NOT_FOUND = false;
    //         break;
    //   }
    // let lastBlock = this.lastConfirmedBlock;
    // if (lastBlock.transactions.has(txId)) {
    // console.log("Transaction Found by Receiver!!!!!!");
    // this.SpartanDarks = SpartanDarkUtils.addSpartanDarkWithValueToWallet(
    //   this.SpartanDarks,
    //   coin
    // );
    // // /COIN_NOT_FOUND = false;
    // return;
    // }
    // this.receiveTransaction(msgInfo);
  //}
  // async receiveTransaction(msgInfo) {
  //   console.log("Received triggered for " + this.name);
  //   //console.log(this.name+" is try");
  //   let txId = msgInfo.txId;
  //   let coin = msgInfo.coin;

  //   let COIN_NOT_FOUND = true;
  //   //let blockWhereTransExist;
  //   // while (COIN_NOT_FOUND) {
  //   //   console.log(this.name + " is finding the blocks again");
  //   //   // for (let index = this.blocks.size-1; index >= 0; index--) {
  //   //   //   let currBlock = SpartanDarkUtils.getMapValueAtIndex(this.blocks, index);
  //   //   //   if (currBlock.transactions.has(txId)) {
  //   //   //     console.log("Transaction Found by Receiver!!!!!!");
  //   //   //     COIN_NOT_FOUND = false;
  //   //   //     break;
  //   //   //   }
  //   //   //   if (!COIN_NOT_FOUND){
  //   //   //     break;
  //   //   //   }
  //   //   // }
  //   //   let lastBlock = this.lastConfirmedBlock;
  //   //   if (lastBlock.transactions.has(txId)) {
  //   //         console.log("Transaction Found by Receiver!!!!!!");
  //   //         COIN_NOT_FOUND = false;
  //   //         break;
  //   //   }
  //   // let lastBlock = this.lastConfirmedBlock;
  //   // if (lastBlock.transactions.has(txId)) {
  //   console.log("Transaction Found by Receiver!!!!!!");
  //   this.SpartanDarks = SpartanDarkUtils.addSpartanDarkWithValueToWallet(
  //     this.SpartanDarks,
  //     coin
  //   );
  //   // /COIN_NOT_FOUND = false;
  //   return;
  //   // }
  //   // this.receiveTransaction(msgInfo);
  // }

  //HACK: could have used. but as zk-spartan-cash has 2 transaction classes,
  // the cfg.transactionClass in Blockchain class is not which is reqd for parent method
  /**
   * Validates and adds a block to the list of blocks, possibly updating the head
   * of the blockchain.  Any transactions in the block are rerun in order to
   * update the gold balances for all clients.  If any transactions are found to be
   * invalid due to lack of funds, the block is rejected and 'null' is returned to
   * indicate failure.
   *
   * If any blocks cannot be connected to an existing block but seem otherwise valid,
   * they are added to a list of pending blocks and a request is sent out to get the
   * missing blocks from other clients.
   *
   * @param {Block | Object} block - The block to add to the clients list of available blocks.
   *
   *  @returns {Block | null} The block with rerun transactions, or null for an invalid block.
   */
  receiveBlock(block) {
    // If the block is a string, then deserialize it.
    //console.log("received bloc triggered for: "+this.name);
    block = SpartanDarkBlockchain.deserializeBlock(block);

    // Ignore the block if it has been received previously.
    if (this.blocks.has(block.id)) return null;

    // First, make sure that the block has a valid proof.
    if (!block.hasValidProof() && !block.isGenesisBlock()) {
      this.log(`Block ${block.id} does not have a valid proof.`);
      return null;
    }

    // Make sure that we have the previous blocks, unless it is the genesis block.
    // If we don't have the previous blocks, request the missing blocks and exit.
    let prevBlock = this.blocks.get(block.prevBlockHash);
    if (!prevBlock && !block.isGenesisBlock()) {
      let stuckBlocks = this.pendingBlocks.get(block.prevBlockHash);
      // If this is the first time that we have identified this block as missing,
      // send out a request for the block.
      if (stuckBlocks === undefined) {
        this.requestMissingBlock(block);
        stuckBlocks = new Set();
      }
      stuckBlocks.add(block);

      this.pendingBlocks.set(block.prevBlockHash, stuckBlocks);
      return null;
    }

    // Storing the block.
    this.blocks.set(block.id, block);

    // If it is a better block than the client currently has, set that
    // as the new currentBlock, and update the lastConfirmedBlock.
    if (this.lastBlock.chainLength < block.chainLength) {
      this.lastBlock = block;
      this.setLastConfirmed();
    }

    // Go through any blocks that were waiting for this block
    // and recursively call receiveBlock.
    let unstuckBlocks = this.pendingBlocks.get(block.id) || [];
    // Remove these blocks from the pending set.
    this.pendingBlocks.delete(block.id);
    unstuckBlocks.forEach((b) => {
      this.log(`Processing unstuck block ${b.id}`);
      this.receiveBlock(b);
    });
    return block;
  }

  /**
   * Used to confirm coins owned by client as we update the cmLedger after minting and not after
   * validation by miners. So we need to check the last confirmed block again to see whether
   * our mint transaction was validated and in turn to check whether our minted coins are valid
   *
   * @param {void}
   *
   * @returns {void}
   */
  confirmOwnedCoins() {
    let lastBlock = this.lastConfirmedBlock;
    //console.log("current list: ");
    //console.log(this.SpartanDarks);
    // for (const [v, coin] of this.SpartanDarks) {
    //   if (!lastBlock.cmLedger.includes(coin.cm)) {
    //     console.log("Coin "+ coin.cm+" not present. Removing");
    //     //delete this.SpartanDarks[coin.cm];
    //     let index = this.SpartanDarks.indexOf([v, coin]);
    //     if (index == this.SpartanDarks.length){
    //       this.SpartanDarks.pop();
    //     }
    //     else if (index == 0){
    //       delete this.SpartanDarks[0];
    //     }
    //     else{
    //       this.SpartanDarks.splice(index, 1);
    //     }
    //   }
    // }
    //console.log("before check: " + this.SpartanDarks);
    // this.SpartanDarks = this.SpartanDarks.filter((entry) =>{
    //   let coin = entry[1];
    //   console.log("coin cm is: ");
    //   console.log(coin.cm);
    //   console.log("lastblock cm ledger: ")
    //   console.log(lastBlock.cmLedger);
    //   return lastBlock.cmLedger.includes(Buffer.from(coin.cm));
    // });
    let iter = this.SpartanDarks.length;
    // console.log("lastblock cm ledger: ");
    // console.log(lastBlock.cmLedger);
    //BETTERCODE: using 2 loops to see if coin cm exists in ledger as a simple filtering like the one above does not seem to work.
    while (iter--) {
      let coin = this.SpartanDarks[iter][1];
      // console.log("coin cm is: ");
      // console.log(coin.cm);

      // let present = SpartanDarkUtils.bufferExistsInList(
      //   lastBlock.cmLedger,
      //   Buffer.from(coin.cm)
      // );
      let cmString = Buffer.from(coin.cm).toString("base64");
      let present = lastBlock.cmLedger.includes(cmString) ? 1 : 0;
      // let present = 0;
      // for (const m of lastBlock.cmLedger) {
      //   //if (!Buffer.compare(m, coin.cm)) {
      //   if (m.equals(coin.cm)) {
      //     console.log("match found!");
      //     //let index = this.SpartanDarks.indexOf(iter);
      //     present = 1;
      //     break;
      //   }
      // }
      if (!present) {
        this.SpartanDarks.splice(iter, 1);
      }
    }
    //console.log("after check: " + this.SpartanDarks);
  }

  /**
   * In order to demonstrate our transactions are executing as intended, we provide this service to
   * verify our results.
   *
   * @param {void}
   *
   * @returns {number} - The client balance
   */
  getBalance() {
    this.confirmOwnedCoins();
    // Adding balance just to show that transaction is occurring as intended. shown using getBalance fn
    //ASK: if coins should be updated after every lastconfirmedBlock update and if yes,
    // where is lastConfirmed getting updated.
    //console.log("Here");
    let balance = 0;
    for (const [v, coin] of this.SpartanDarks) {
      balance += coin.v;
      // console.log("Value of coin is: "+coin.v);
      // this.balance += coin.v;
    }
    //console.log("My balance is "+balance);
    return balance;
  }

  generateNewAddress() {
    this.keyPair = SpartanDarkUtils.generateKeypair();
    this.address = SpartanDarkUtils.calcAddress(this.keyPair.public);
    this.addrPK = this.keyPair.public;
    this.addressBindings[this.keyPair.public] = this.keyPair.private;
  }

  generateEncDecKeyPair() {
    let encDecKeyPair = SpartanDarkUtils.generateKeypair();
    this.pubEncKey = encDecKeyPair.public;
    // DESIGNDEC: marking private decryption key as private using '#'
    this.#privDecKey = encDecKeyPair.private;
    // console.log("Pub priv enc dec keys");
    // console.log(this.pubEncKey);
    // console.log(this.#privDecKey);
    // console.log();
  }
}

module.exports.SpartanDarkClient = SpartanDarkClient;
