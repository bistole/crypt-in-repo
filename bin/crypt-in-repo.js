#!/usr/bin/env node
const parseParams = require("../src/libs/parse-params");
const main = require("../src/main");

try {
    parseParams.readCommandline(process.argv, (command, configs) => {
        if (command === "encode") {
            main.encrypt(configs);
        } else {
            main.decrypt(configs);
        }
    });
} catch (e) {
    console.error(e);
}