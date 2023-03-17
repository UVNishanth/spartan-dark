"use strict";

const {SpartanZeroBlockchain} = require('./spartan-zero-blockchain.js');
const {SpartanZeroBlock} = require('./spartan-zero-block.js');
const {SpartanZeroClient} = require('./spartan-zero-client.js');
const SpartanZeroMiner = require('./spartan-zero-miner.js');
const { TranMint } = require('./spartan-zero-tran-mint.js');
const { TranPour } = require('./spartan-zero-tran-pour.js');
const SpartanZeroTransaction = require('./spartan-zero-transaction.js');
const {SpartanZero} = require('./spartan-zero.js');
const { FakeNet, Transaction } = require('spartan-gold');

console.log("Starting simulation.  This may take a moment...\n");


let fakeNet = new FakeNet();

// Clients
let alice = new SpartanZeroClient({name: "Alice", net: fakeNet});
let bob = new SpartanZeroClient({name: "Bob", net: fakeNet});
let charlie = new SpartanZeroClient({name: "Charlie", net: fakeNet});

// Miners
let minnie = new SpartanZeroMiner({name: "Minnie", net: fakeNet});
let mickey = new SpartanZeroMiner({name: "Mickey", net: fakeNet});

// Start each client and miner off with initAmt coins
// let initialCoins = [];
// const initAmt = 4;
// initialCoins = initialCoins.concat(alice.createInitialCoins(initAmt));
// initialCoins = initialCoins.concat(bob.createInitialCoins(initAmt));
// initialCoins = initialCoins.concat(charlie.createInitialCoins(initAmt));
// initialCoins = initialCoins.concat(minnie.createInitialCoins(initAmt));
// initialCoins = initialCoins.concat(mickey.createInitialCoins(initAmt));

// Creating genesis block
let genesis = SpartanZeroBlockchain.makeGenesis({
  blockClass: SpartanZeroBlock,
  mintTransactionClass: TranMint,
  pourTransactionClass: TranPour,
  clientBalanceMap: new Map([
    [alice, 233],
    [bob, 99],
    [charlie, 67],
    [minnie, 400],
    [mickey, 300],
  ]),
  coinbaseAmount: 1
});

// alice.setGenesisBlock(SpartanZeroBlockchain.copyBlock(genesis));
// bob.setGenesisBlock(SpartanZeroBlockchain.copyBlock(genesis));
// charlie.setGenesisBlock(SpartanZeroBlockchain.copyBlock(genesis));
// minnie.setGenesisBlock(SpartanZeroBlockchain.copyBlock(genesis));
// mickey.setGenesisBlock(SpartanZeroBlockchain.copyBlock(genesis));

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
console.log("Alice is minting coin of value 2");
alice.mint(7);
console.log("Charlie is minting coin of value 9");
charlie.mint(9);

console.log("Bob is minting coin of value 50");

//need to wait for sometime so that minting process begins so that the client finds some coins in their purse
setTimeout(() => {
  charlie.spend(alice, 5);
}, 100);

console.log("Bob is minting coin of value 50");
bob.mint(50);

setTimeout(() => {
  bob.spend(alice, 20);
}, 100);



//ASK: too large a timeout. Ask how to trigger after spend is done.
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
  console.log("Bob now has coins of total value: "+bob.getBalance());
  //alice.getBalance().then((balance) => {console.log("Alice now has coins of total value: "+balance);});
  //charlie.getBalance().then((balance) => {console.log("Charlie now has coins of total value: "+balance);});
  process.exit(0);
}, 30000);


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
