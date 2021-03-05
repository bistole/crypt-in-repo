#!/usr/bin/env node
const parseParams = require("../src/libs/parse-params");
const main = require("../src/main");

try {
    parseParams.readCommandline(process.argv, (command, configs) => {
        switch (command) {
        case "encrypt":
            main.encrypt(configs);
            break;
        case "decrypt":
            main.decrypt(configs);
            break;
        default:
            throw new Error(`Unknown command: ${command}`);
        }
    });
} catch (e) {
    console.error(e);
}