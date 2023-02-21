"use strict";

const {ZeroCoinBlockchain} = require('./zero-coin-blockchain.js');
const {ZeroCoinBlock} = require('./zero-coin-block.js');
const {ZeroCoinClient} = require('./zero-coin-client.js');
const ZeroCoinMiner = require('./zero-coin-miner.js');
const { TranMint } = require('./zero-coin-tran-mint.js');
const ZeroCoinTransaction = require('./zero-coin-transaction.js');
const ZeroCoin = require('./zero-coin.js');
const { FakeNet, Transaction } = require('spartan-gold');

console.log("Starting simulation.  This may take a moment...\n");


let fakeNet = new FakeNet();

// Clients
let alice = new ZeroCoinClient({name: "Alice", net: fakeNet});
let bob = new ZeroCoinClient({name: "Bob", net: fakeNet});
let charlie = new ZeroCoinClient({name: "Charlie", net: fakeNet});

// Miners
let minnie = new ZeroCoinMiner({name: "Minnie", net: fakeNet});
let mickey = new ZeroCoinMiner({name: "Mickey", net: fakeNet});

// Start each client and miner off with initAmt coins
// let initialCoins = [];
// const initAmt = 4;
// initialCoins = initialCoins.concat(alice.createInitialCoins(initAmt));
// initialCoins = initialCoins.concat(bob.createInitialCoins(initAmt));
// initialCoins = initialCoins.concat(charlie.createInitialCoins(initAmt));
// initialCoins = initialCoins.concat(minnie.createInitialCoins(initAmt));
// initialCoins = initialCoins.concat(mickey.createInitialCoins(initAmt));

// Creating genesis block
let genesis = ZeroCoinBlockchain.makeGenesis({
  blockClass: ZeroCoinBlock,
  mintTransactionClass: TranMint,
  pourTransactionClass: Transaction,
  clientBalanceMap: new Map([
    [alice, 233],
    [bob, 99],
    [charlie, 67],
    [minnie, 400],
    [mickey, 300],
  ]),
  coinbaseAmount: 1
});

// alice.setGenesisBlock(ZeroCoinBlockchain.copyBlock(genesis));
// bob.setGenesisBlock(ZeroCoinBlockchain.copyBlock(genesis));
// charlie.setGenesisBlock(ZeroCoinBlockchain.copyBlock(genesis));
// minnie.setGenesisBlock(ZeroCoinBlockchain.copyBlock(genesis));
// mickey.setGenesisBlock(ZeroCoinBlockchain.copyBlock(genesis));

function showBalances() {
  console.log(`Alice has ${alice.confirmedBalance} coins.`);
  console.log(`Bob has ${bob.confirmedBalance} coins.`);
  console.log(`Charlie has ${charlie.confirmedBalance} coins.`);
  console.log(`Minnie has ${minnie.confirmedBalance} coins.`);
  console.log(`Mickey has ${mickey.confirmedBalance} coins.\n`);
}

// Showing the initial balances from Alice's perspective, for no particular reason.
console.log("Initial balances:");
showBalances();

fakeNet.register(alice, bob, charlie, minnie, mickey);

// Miners start mining.
minnie.initialize();
mickey.initialize();

//Mint new coins
console.log("Charlie is minting coin of value 2");
charlie.mint(2);
alice.mint(7);
charlie.mint(9);

setTimeout(() => {
  console.log();
  console.log(`Minnie has a chain of length ${minnie.currentBlock.chainLength}`);
  console.log(`Mickey has a chain of length ${mickey.currentBlock.chainLength}`);
  console.log("Final balances:");
//   console.log(`Alice has ${alice.confirmedBalance} coins.`);
//   console.log(`Bob has ${bob.confirmedBalance} coins.`);
//   console.log(`Charlie has ${charlie.confirmedBalance} coins.`);
//   console.log(`Minnie has ${minnie.confirmedBalance} coins.`);
//   console.log(`Mickey has ${mickey.confirmedBalance} coins.`);
//   console.log("Transaction List: ");
  console.log("Alice now has coins of total value: "+alice.getBalance());
  console.log("Charlie now has coins of total value: "+charlie.getBalance());
  process.exit(0);
}, 1000);


// // Transfer some money around.
// console.log(`Charlie is transferring 2 coins to ${bob.address}`);
// charlie.postTransaction(bob.address, 2);
// console.log(`Alice is transferring a coin to ${bob.address}`);
// alice.postTransaction(bob.address);

// // Print out the final balances after it has been running for some time.
// setTimeout(() => {
//   console.log();
//   console.log(`Minnie has a chain of length ${minnie.currentBlock.chainLength}`);
//   console.log(`Mickey has a chain of length ${mickey.currentBlock.chainLength}`);
//   console.log("Final balances:");
//   console.log(`Alice has ${alice.confirmedBalance} coins.`);
//   console.log(`Bob has ${bob.confirmedBalance} coins.`);
//   console.log(`Charlie has ${charlie.confirmedBalance} coins.`);
//   console.log(`Minnie has ${minnie.confirmedBalance} coins.`);
//   console.log(`Mickey has ${mickey.confirmedBalance} coins.`);
//   process.exit(0);
// }, 120000);
