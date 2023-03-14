"use strict";

const aleaRNGFactory = require("number-generator/lib/aleaRNGFactory");

const { utils } = require("spartan-gold");
const { SpartanZero } = require("./spartan-zero");
const crypto = require("crypto");
//const { SpartanZeroClient } = require("./spartan-zero-client");

// creating constansts for prf types
const ADDR = "addr";
const SN = "sn";
const PK = "pk";

let sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// let gen = function (seed = Date.now()) {
//   sleep(50);
//   return aleaRNGFactory(seed).uInt32();
// };

let getRand256Num = function () {
  //let randomBytes = new Uint8Array(32);
  //getRandomValues(randomBytes);
  //return Buffer.alloc(32, randomBytes);
  return crypto.randomBytes(32);
};

// module.exports.hash = (s, encoding) => {
//   return utils.hash(s, encoding);
// };

let comm = (x, rho, r) => {
  x = Buffer.isBuffer(x) ? x : Buffer.from(x);
  rho = Buffer.isBuffer(rho) ? x : Buffer.from(rho);
  r = Buffer.isBuffer(r) ? x : Buffer.from(r);
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
module.exports.prf = (x, type, z) => {
  // z is generally an addr key. to standardize it, we hash and then use. Read points-to-be-noted
  z = hash(z);
  switch (type) {
    case ADDR:
      return hash(x + "00" + z + "");

    case SN:
      return hash(x + "01" + z + "");

    case PK:
      return hash(x + "10" + z + "");
  }
};

module.exports.OrderSpartanZero = (a, b) => {
  return a[0] - b[0];
};

/**
 *
 * @param {SpartanZero[]} arr spartanzero list a client has
 * @param {Number} val amount a client needs to send
 * @returns {SpartanZero}
 */
// BETTERCODE:returning smallest coin > val. using linear search. replace with optimized code
// Finding > and not >= so that we always have two coins generated. if >=, then it might return a coin which is equal and then we won't be able to create 2 coins
module.exports.findAppropSpartanZero = (arr, val) => {
  arr.forEach((el) => {
    if (el.v > val) {
      return el;
    }
  });
};

/**
 *
 * @param {SpartanZeroClient} owner client who owns the created SpartanZero
 * @param {SpartanZero} value value of created SpartanZero
 * @returns {SpartanZero} return newly created SpartanZero
 */

module.exports.createNewSpartanZero = (owner, value) => {
  //let rho = gen();
  let rho = getRand256Num();
  //let r = gen();
  let r = getRand256Num();
  //let bitArrR = r.toString(2);
  //console.log("Actual r: "+r);
  //console.log("bitarray r: "+bitArrR);
  //let s = gen();
  let s = getRand256Num();

  let hashValue = hash(value + "");
  console.log(hashValue.length);

  //let k = utils.hash(this.keyPair.public + r + rho+'');
  // hashing addrPK so that input to hash is 256-bit. apk is 512-bit. Read points-to-be-noted
  //let hashAddrPK = utils.hash(owner.addrPK);
  let hashAddrPK = hash(owner.addrPK);
  console.log(hashAddrPK.length);
  let k = comm(hashAddrPK, r, rho);
  //let stringS = s.toString();
  //let cm = comm(hashValue, k, s.toString());
  let cm = comm(hashValue, k, s);

  return [k, new SpartanZero(owner.addrPK, value, hashValue, rho, r, s, cm)];
};

//DESIGNDEC: Writing own hash func coz spartan-gold's hash() creates a a hash digest of size 512 bits, while we have standardized 256-bit hashes for ease of use in circuits
let hash = (s) => {
  let res = crypto.createHash("sha256").update(s).digest();
  console.log(Buffer.byteLength(res));
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
      //let index = this.spartanZeroes.indexOf(iter);
      return 1;
    }
  }
  return 0;
};

module.exports.ADDR = ADDR;
module.exports.SN = SN;
module.exports.PK = PK;
//module.exports.gen = gen;
module.exports.comm = comm;
//module.exports.hash = utils.hash;
module.exports.hash = hash;
module.exports.generateKeypair = utils.generateKeypair;
module.exports.calcAddress = utils.calcAddress;
module.exports.getRand256Num = getRand256Num;
module.exports.bufferExistsInList = bufferExistsInList;
