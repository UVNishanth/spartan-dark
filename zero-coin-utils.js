"use strict";

const aleaRNGFactory = require("number-generator/lib/aleaRNGFactory");


let sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports.gen = function(seed = Date.now()) {
    sleep(50);
    return aleaRNGFactory(seed).uInt32();
};
