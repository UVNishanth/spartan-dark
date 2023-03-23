"use strict";

const { Client, utils } = require("spartan-gold");
const snarkjs = require("snarkjs");
const fs = require("fs");
const { SpartanZeroBlockchain } = require("./spartan-zero-blockchain.js");
const { SpartanZero } = require("./spartan-zero.js");
const SpartanZeroUtils = require("./spartan-zero-utils.js");
const { TranMint } = require("./spartan-zero-tran-mint.js");
const { TranPour } = require("./spartan-zero-tran-pour.js");

//TODO: add functionality to mint new coins after initializing blockchain makeGenesis so that
// the associated balance is converted into coins which the client cna then spend. Which can then be
// used to determine whether the client has enough funds to mint a coin of specified value and hence
// avoiding generation of coins out of thin air
/**
 * A SpartanZeroClient is capable of minting coins and sending/receiving minted coins
 */
class SpartanZeroClient extends Client {
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

    // spartanZeroes = (value, coin) []
    //DESIGNDEC: changing dict of cm -> coin to list of tuples (value, coin) coz list easier to sort than dict
    this.spartanZeroes = [];
    this.on(SpartanZeroBlockchain.PROOF_FOUND, this.receiveBlock);
    this.on(SpartanZeroBlockchain.RECEIVE_TRANSACTION, this.receiveTransaction);

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
    let mintedCoin = SpartanZeroUtils.createNewSpartanZero(this, value);
    let cm = Buffer.from(mintedCoin.cm);

    //this.spartanZeroes.push(mintedCoin);
    //BETTERCODE: currently sorting using comparator after adding. Change so that element gets added into a sorted list and sorts itself during insertion

    // this.spartanZeroes.push([value, mintedCoin]);
    // console.log("After push: ");
    // console.log(this.spartanZeroes + "\n\n");
    // this.spartanZeroes.sort(SpartanZeroUtils.OrderSpartanZero);
    this.spartanZeroes = SpartanZeroUtils.addSpartanZeroWithValueToWallet(
      this.spartanZeroes,
      mintedCoin
    );
    console.log("CM for newly minted coin: ");
    console.log(cm);

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
  postMintTransaction(mintTxData) {
    let tx = new TranMint(mintTxData);

    //HIGHLIGHTS: Don't need to sign transaction unlike in original
    //tx.sign(this.keyPair.private);

    // Adding transaction to pending.
    this.pendingOutgoingTransactions.set(tx.id, tx);

    //HIGHLIGHTS: nonce isn't utilized
    //this.nonce++;

    this.net.broadcast(SpartanZeroBlockchain.POST_TRANSACTION, tx);

    return tx;
  }

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

    this.net.broadcast(SpartanZeroBlockchain.POST_TRANSACTION, tx);

    return tx;
  }

  /**
   *
   * @param {SpartanZeroClient} receiver
   * @param {Number} amount
   */
  async spend(receiver, amount) {
    let currBalance = this.getBalance();
    if (currBalance < amount) {
      throw new Error(
        "Not enough balance to pay. Curr Balance: " + currBalance
      );
    }

    let oldSpartanZero = SpartanZeroUtils.findAppropSpartanZero(
      this.spartanZeroes,
      amount
    );

    console.log("spartanZeroes list before deletion of old coin");
    console.log(this.spartanZeroes);

    this.spartanZeroes = this.spartanZeroes.filter((entry) => {
      let coin = entry[1];
      return coin.cm !== oldSpartanZero.cm;
    });

    console.log("cm of old coin deleted");
    console.log(oldSpartanZero.cm);
    console.log("Updated spartanZeroes list after spending");
    console.log(this.spartanZeroes);

    console.log("Printing old coins props...");
    SpartanZeroUtils.printObjectProperties(oldSpartanZero);

    let rhoOld = oldSpartanZero.rho;
    // get addrSK of old coin
    let addrSKOld = this.addressBindings[oldSpartanZero.addrPK];
    let snOld = SpartanZeroUtils.prf(rhoOld, SpartanZeroUtils.SN, addrSKOld);
    //let recvAddr = receiver.address;

    // the amount the spender needs to get back after spending the requd amount
    let change = oldSpartanZero.v - amount;
    let coinToSpend = SpartanZeroUtils.createNewSpartanZero(receiver, amount);
    // remaining amount spender needs to send back to themselves
    let coinChange = SpartanZeroUtils.createNewSpartanZero(this, change);

    // client needs to get back coinChange. so we can store coinChange in client's list and then check if transaction got validated while doing getBalance()
    //this.spartanZeroes.push([change, coinChange]);
    this.spartanZeroes = SpartanZeroUtils.addSpartanZeroWithValueToWallet(
      this.spartanZeroes,
      coinChange
    );
    console.log("After getting back change: ");
    console.log(this.spartanZeroes);
    console.log("\n\n");
    this.spartanZeroes.sort(SpartanZeroUtils.OrderSpartanZero);

    const sigKeys = SpartanZeroUtils.generateKeypair();
    let pkSig = sigKeys.public;
    let skSig = sigKeys.private;
    let hSig = SpartanZeroUtils.hash(pkSig);
    let h_ = SpartanZeroUtils.prf(hSig, SpartanZeroUtils.PK, addrSKOld);
    let circuitInput = {
      k: SpartanZeroUtils.bufferToBitArray(
        SpartanZeroUtils.comm(
          SpartanZeroUtils.hash(oldSpartanZero.addrPK),
          oldSpartanZero.r,
          oldSpartanZero.rho
        )
      ),
      hashValue: SpartanZeroUtils.bufferToBitArray(oldSpartanZero.hashedV),
      s: SpartanZeroUtils.bufferToBitArray(oldSpartanZero.s),
      cm: SpartanZeroUtils.bufferToBitArray(oldSpartanZero.cm),
    };

    let proofPacket = await snarkjs.groth16.fullProve(
      circuitInput,
      "circuit.wasm",
      "circuit_final.zkey"
    );

    console.log("For pour: generated 2 new coins of cm: ");
    console.log(coinToSpend.cm);
    console.log(coinChange.cm);

    let tx = this.postGenericTransaction({
      sn: snOld,
      cm1New: coinToSpend.cm,
      cm2New: coinChange.cm,
      pkSig: pkSig,
      h: h_,
      proof: proofPacket,
      //TODO: Generate proper sigma. now using placeholder as we aren't using it for now
      sigma: "",
    });

    //Send notification to receiver to check for pour transaction on the ledger
    //DESIGNDEC: Sending coin alongwith notification so that the receiver can only check if the pourT id sent is present on the ledger and if yes, put that coin in its wallet. So our enc dec logic becomes redundant as the receiver already has the coin and does not need to decrypt anything from the pour transaction. Simplifying the actual logic of zerocash
    this.net.sendMessage(
      receiver.address,
      SpartanZeroBlockchain.RECEIVE_TRANSACTION,
      {
        cm: coinToSpend.cm,
        coin: coinToSpend,
      }
    );
    // this.net.sendMessage(
    //   this.address,
    //   SpartanZeroBlockchain.RECEIVE_TRANSACTION,
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
    console.log("Received triggered for "+this.name);
    //console.log(this.name+" is try");
    let txId = msgInfo.txId;
    let coin = msgInfo.coin;

    let COIN_NOT_FOUND = true;
    //let blockWhereTransExist;
    // while (COIN_NOT_FOUND) {
    //   console.log(this.name + " is finding the blocks again");
    //   // for (let index = this.blocks.size-1; index >= 0; index--) {
    //   //   let currBlock = SpartanZeroUtils.getMapValueAtIndex(this.blocks, index);
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
    console.log("Transaction Found by Receiver!!!!!!");
    this.spartanZeroes = SpartanZeroUtils.addSpartanZeroWithValueToWallet(
      this.spartanZeroes,
      coin
    );
    // /COIN_NOT_FOUND = false;
    return;
    // }
    // this.receiveTransaction(msgInfo);
  }

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
    block = SpartanZeroBlockchain.deserializeBlock(block);

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
    //console.log(this.spartanZeroes);
    // for (const [v, coin] of this.spartanZeroes) {
    //   if (!lastBlock.cmLedger.includes(coin.cm)) {
    //     console.log("Coin "+ coin.cm+" not present. Removing");
    //     //delete this.spartanZeroes[coin.cm];
    //     let index = this.spartanZeroes.indexOf([v, coin]);
    //     if (index == this.spartanZeroes.length){
    //       this.spartanZeroes.pop();
    //     }
    //     else if (index == 0){
    //       delete this.spartanZeroes[0];
    //     }
    //     else{
    //       this.spartanZeroes.splice(index, 1);
    //     }
    //   }
    // }
    console.log("before check: " + this.spartanZeroes);
    // this.spartanZeroes = this.spartanZeroes.filter((entry) =>{
    //   let coin = entry[1];
    //   console.log("coin cm is: ");
    //   console.log(coin.cm);
    //   console.log("lastblock cm ledger: ")
    //   console.log(lastBlock.cmLedger);
    //   return lastBlock.cmLedger.includes(Buffer.from(coin.cm));
    // });
    let iter = this.spartanZeroes.length;
    console.log("lastblock cm ledger: ");
    console.log(lastBlock.cmLedger);
    //BETTERCODE: using 2 loops to see if coin cm exists in ledger as a simple filtering like the one above does not seem to work.
    while (iter--) {
      let coin = this.spartanZeroes[iter][1];
      console.log("coin cm is: ");
      console.log(coin.cm);

      let present = SpartanZeroUtils.bufferExistsInList(
        lastBlock.cmLedger,
        Buffer.from(coin.cm)
      );
      // let present = 0;
      // for (const m of lastBlock.cmLedger) {
      //   //if (!Buffer.compare(m, coin.cm)) {
      //   if (m.equals(coin.cm)) {
      //     console.log("match found!");
      //     //let index = this.spartanZeroes.indexOf(iter);
      //     present = 1;
      //     break;
      //   }
      // }
      if (!present) {
        this.spartanZeroes.splice(iter, 1);
      }
    }
    console.log("after check: " + this.spartanZeroes);
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
    for (const [v, coin] of this.spartanZeroes) {
      balance += coin.v;
      // console.log("Value of coin is: "+coin.v);
      // this.balance += coin.v;
    }
    //console.log("My balance is "+balance);
    return balance;
  }

  generateNewAddress() {
    this.keyPair = SpartanZeroUtils.generateKeypair();
    this.address = SpartanZeroUtils.calcAddress(this.keyPair.public);
    this.addrPK = this.keyPair.public;
    this.addressBindings[this.keyPair.public] = this.keyPair.private;
  }

  generateEncDecKeyPair() {
    let encDecKeyPair = SpartanZeroUtils.generateKeypair();
    this.pubEncKey = encDecKeyPair.public;
    // DESIGNDEC: marking private decryption key as private using '#'
    this.#privDecKey = encDecKeyPair.private;
    console.log("Pub priv enc dec keys");
    console.log(this.pubEncKey);
    console.log(this.#privDecKey);
    console.log();
  }
}

module.exports.SpartanZeroClient = SpartanZeroClient;
