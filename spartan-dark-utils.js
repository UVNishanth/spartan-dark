"use strict";

const aleaRNGFactory = require("number-generator/lib/aleaRNGFactory");

const { utils } = require("spartan-gold");
const { SpartanDark } = require("./spartan-dark");
const crypto = require("crypto");
//const { SpartanDarkClient } = require("./spartan-dark-client");

// creating constansts for prf types
const ADDR = "addr";
const SN = "sn";
const PK = "pk";

const BYTE_SIZE = 2;

let sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// let gen = function (seed = Date.now()) {
//   sleep(50);
//   return aleaRNGFactory(seed).uInt32();
// };

// Circuits do not take Buffers as inputs. Need to convert them into bitarrays
//CITE: https://github.com/iden3/circomlib/blob/master/test/sha256.js
let bufferToBitArray = function (buf) {
  let result = [];
  for (let i = 0; i < buf.length; i++) {
    for (let j = 0; j < 8; j++) {
      result.push((buf[i] >> (7 - j)) & 1);
    }
  }
  return result;
};

let getRand256Num = function () {
  //let randomBytes = new Uint8Array(32);
  //getRandomValues(randomBytes);
  //return Buffer.alloc(32, randomBytes);
  return crypto.randomBytes(32);
};

let getRandNum = function () {
  //let randomBytes = new Uint8Array(32);
  //getRandomValues(randomBytes);
  //return Buffer.alloc(32, randomBytes);
  return crypto.randomBytes(BYTE_SIZE);
};


// module.exports.hash = (s, encoding) => {
//   return utils.hash(s, encoding);
// };

let comm = (x, rho, r) => {
  x = Buffer.isBuffer(x) ? x : Buffer.from(x);
  rho = Buffer.isBuffer(rho) ? rho : Buffer.from(rho);
  r = Buffer.isBuffer(r) ? r : Buffer.from(r);
  let s = Buffer.concat([x, rho, r]);
  return hash(s);
};

/**
 *
 * @param {*} x
 * @param { const } type prf type
 * @param {*} z rho value
 * @returns
 */
// module.exports.prf = (x, type, z) => {
//   // z is generally an addr key. to standardize it, we hash and then use. Read points-to-be-noted
//   z = hash(z);
//   switch (type) {
//     case ADDR:
//       return hash(x + "00" + z + "");

//     case SN:
//       return hash(x + "01" + z + "");

//     case PK:
//       return hash(x + "10" + z + "");
//   }
// };

module.exports.prf = (addr, cm) => {
  cm = Buffer.isBuffer(cm) ? cm : Buffer.from(cm);
  addr = Buffer.isBuffer(addr) ? addr : Buffer.from(addr);
  let s = Buffer.concat([addr, cm]);
  return hash(s);

};


let OrderSpartanDark = (a, b) => {
  return a[0] - b[0];
};

/**
 *
 * @param {SpartanDark[]} arr SpartanDark list a client has
 * @param {Number} val amount a client needs to send
 * @returns {SpartanDark}
 */
// BETTERCODE:returning smallest coin > val. using linear search. replace with optimized code
// Finding > and not >= so that we always have two coins generated. if >=, then it might return a coin which is equal and then we won't be able to create 2 coins
module.exports.findAppropSpartanDark = (arr, val) => {
  // console.log("coin list is: ");
  // console.log(arr);
  // console.log("Val is: ");
  // console.log(val);
  for (const [v, coin] of arr) {
    if (v > val) {
      return coin;
    }
  }
  console.log("No coin found");
};

/**
 *
 * @param {SpartanDarkClient} owner client who owns the created SpartanDark
 * @param {SpartanDark} value value of created SpartanDark
 * @returns {SpartanDark} return newly created SpartanDark
 */

module.exports.createNewSpartanDark = (owner, value) => {
  let rho = getRandNum();
  let r = getRandNum();
  let s = getRandNum();

  let hashValue = hash(value + "");
  let hashAddrPK = hash(owner.addrPK);
  let k = comm(hashAddrPK, r, rho);
  let cm = comm(hashValue, k, s);

  return new SpartanDark(owner.addrPK, value, hashValue, rho, r, s, cm, k);
};

//DESIGNDEC: Writing own hash func coz spartan-gold's hash() creates a a hash digest of size 512 bits, while we have standardized 256-bit hashes for ease of use in circuits
let hash = (s) => {
  let res = crypto.createHash("sha256").update(s).digest();
  res = Uint8Array.prototype.slice.call(res, 0, BYTE_SIZE);
  //console.log(Buffer.byteLength(res));
  return res;
};

/**
 *
 * @param {Buffer[]} list
 * @param {Buffer} buff
 * @returns
 */

let bufferExistsInList = (list, buff) => {
  for (const el of list) {
    if (el.equals(buff)) {
      return 1;
    }
  }
  return 0;
};

let printObjectProperties = (obj) => {
  // for(let props in obj){
  //   console.log(props);
  // }
};

module.exports.getMapValueAtIndex = (map, index) => {
  let key = Array.from(map.keys())[index];
  return map.get(key);
};

module.exports.printWallet = (client) => {
  let wallet = client.SpartanDarks;
  for (const coin of wallet){
    printObjectProperties(coin);
  }
};

module.exports.addSpartanDarkWithValueToWallet = (wallet, SpartanDark) => {
  wallet.push([SpartanDark.v, SpartanDark]);
  wallet.sort(OrderSpartanDark);
  return wallet;
};


module.exports.ADDR = ADDR;
module.exports.SN = SN;
module.exports.PK = PK;
module.exports.comm = comm;
module.exports.hash = hash;
module.exports.generateKeypair = utils.generateKeypair;
module.exports.calcAddress = utils.calcAddress;
module.exports.getRandNum = getRandNum;
module.exports.bufferExistsInList = bufferExistsInList;
module.exports.bufferToBitArray = bufferToBitArray;
module.exports.printObjectProperties = printObjectProperties;
module.exports.OrderSpartanDark = OrderSpartanDark;
module.exports.BYTE_SIZE = BYTE_SIZE;
module.exports.CMLEDGER_MAXSIZE = 16;
