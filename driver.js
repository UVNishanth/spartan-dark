"use strict";

const { SpartanDarkBlockchain } = require("./spartan-dark-blockchain.js");
const { SpartanDarkBlock } = require("./spartan-dark-block.js");
const { SpartanDarkClient } = require("./spartan-dark-client.js");
const SpartanDarkMiner = require("./spartan-dark-miner.js");
const { TranMint } = require("./spartan-dark-tran-mint.js");
const { TranPour } = require("./spartan-dark-tran-pour.js");
const { FakeNet } = require("spartan-gold");

console.log("Starting simulation.  This may take a moment...\n");

let fakeNet = new FakeNet();

// Clients
let alice = new SpartanDarkClient({ name: "Alice", net: fakeNet });
let bob = new SpartanDarkClient({ name: "Bob", net: fakeNet });
let charlie = new SpartanDarkClient({ name: "Charlie", net: fakeNet });

// Miners
let minnie = new SpartanDarkMiner({ name: "Minnie", net: fakeNet });
let mickey = new SpartanDarkMiner({ name: "Mickey", net: fakeNet });

// Creating genesis block
let genesis = SpartanDarkBlockchain.makeGenesis({
  blockClass: SpartanDarkBlock,
  mintTransactionClass: TranMint,
  pourTransactionClass: TranPour,
  clientBalanceMap: new Map([
    [alice, 233],
    [bob, 99],
    [charlie, 67],
    [minnie, 400],
    [mickey, 300],
  ]),
  coinbaseAmount: 1,
});

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

//const start = Date.now();
//Mint new coins
//for (let i = 1; i <= 2; i++) {
  console.log("Charlie is minting coin of value 2");
  charlie.mint(2);
  console.log("Alice is minting coin of value 2");
  alice.mint(7);
  console.log("Charlie is minting coin of value 9");
  charlie.mint(9);

  /**
   * Balances now:
   * alice: 7
   * charlie: 11
   */

  //console.log("Bob is minting coin of value 50");

  //need to wait for sometime so that minting process begins so that the client finds some coins in their purse
  setTimeout(() => {
    charlie.spend(alice, 5);
  }, 100);

  /**
   * alice: 7+5 = 12
   * charlie: 11-5 = 6
   */

  console.log("Bob is minting coin of value 50");
  bob.mint(50);

  /**
   * alice: 12
   * charlie: 6
   * bob: 50
   */

  setTimeout(() => {
    bob.spend(alice, 20);
  }, 100);

  /**
   * alice: 12 + 20 = 32
   * charlie: 6
   * bob: 50 - 20 = 30
   */

  //FLAW: Alice cannot spend here coz they havem't yet received he amount sent previously by Bob and Charlie. So they do not have sufficient balance. this is happening coz javascript is single-threaded and so for alice to spend, they would need the previous transactions to have gotten completed
  setTimeout(() => {
    alice.spend(bob, 4);
  }, 100);


  // charlie.mint(2);
  // setTimeout(() => {
  //   charlie.spend(alice, 5);
  // }, 10000);

  // console.log("Alice is minting coin of value 2");
  // alice.mint(7);
  // console.log("Charlie is minting coin of value 9");
  // charlie.mint(9);




  /**
   * alice: 32 - 4 = 28
   * charlie: 6
   * bob: 30 + 4 = 34
   */
//}

/** iter: 2
 * alice: 28 + 7 = 35 + 5 = 40 + 20 = 60 - 4 = 56
 * charlie: 6 + 11 = 17 - 5 = 12
 * bob: 34 + 50 = 84 - 20 = 64 + 4 = 68
 */

//ASK: too large a timeout. Ask how to trigger after spend is done.
//FLAW: the timeout increases with the amount of spending added due to the time the proving method takes
setTimeout(() => {
  console.log();
  console.log(
    `Minnie has a chain of length ${minnie.currentBlock.chainLength}`
  );
  console.log(
    `Mickey has a chain of length ${mickey.currentBlock.chainLength}`
  );
  console.log("Final balances:");
  console.log("Alice now has coins of total value: " + alice.getBalance());
  console.log("Alice wallet: ")
  //console.log(alice.SpartanDarks);
  console.log("Charlie now has coins of total value: " + charlie.getBalance());
  console.log("Charlie wallet: ");
  //console.log(charlie.SpartanDarks);
  console.log("Bob now has coins of total value: " + bob.getBalance());
  console.log("Bob wallet: ")
  //console.log(bob.SpartanDarks);
  //alice.getBalance().then((balance) => {console.log("Alice now has coins of total value: "+balance);});
  //charlie.getBalance().then((balance) => {console.log("Charlie now has coins of total value: "+balance);});
  process.exit(0);
}, 70000);

