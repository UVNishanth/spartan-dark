"use strict";

const aleaRNGFactory = require("number-generator/lib/aleaRNGFactory");

const { utils } = require("spartan-gold");
const { SpartanZero } = require("./spartan-zero");
//const { SpartanZeroClient } = require("./spartan-zero-client");

// creating constansts for prf types
const ADDR = "addr";
const SN = "sn";
const PK = "pk";

let sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let gen = function (seed = Date.now()) {
  sleep(50);
  return aleaRNGFactory(seed).uInt32();
};

module.exports.hash = (s, encoding) => {
  return utils.hash(s, encoding);
};

let comm = (apk, rho, r) => {
  return utils.hash(apk + rho + r + "");
};

/**
 *
 * @param {*} x
 * @param { const } type prf type
 * @param {*} z rho value
 * @returns
 */
module.exports.prf = (x, type, z) => {
  switch (type) {
    case ADDR:
      return utils.hash(x + "00" + z + "");

    case SN:
      return utils.hash(x + "01" + z + "");

    case PK:
      return utils.hash(x + "10" + z + "");
  }
};

module.exports.generateSigKeys = () => {
  return utils.generateKeypair();
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
// BETTERCODE:returning smallest coin >= val. using linear search. replace with optimized code
module.exports.findAppropSpartanZero = (arr, val) => {
  arr.forEach((el) => {
    if (el.v >= val) {
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
  let rho = gen();
  let r = gen();
  //let bitArrR = r.toString(2);
  //console.log("Actual r: "+r);
  //console.log("bitarray r: "+bitArrR);
  let s = gen();

  //let k = utils.hash(this.keyPair.public + r + rho+'');
  let k = comm(owner.addrPK, r, rho);
  let cm = comm(value, k, s);

  return new SpartanZero(owner.address, value, rho, r, s, cm);
};

module.exports.ADDR = ADDR;
module.exports.SN = SN;
module.exports.PK = PK;
module.exports.gen = gen;
module.exports.comm = comm;
