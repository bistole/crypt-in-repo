#!/usr/bin/env node
const parseParams = require("../src/libs/parse-params");
const main = require("../src/main");

parseParams.readCommandline(process.argv, (err, command, configs) => {
    if (err) {
        console.error(err);
        return;
    }

    switch (command) {
    case "encrypt":
        main.encrypt(configs);
        break;
    case "decrypt":
        main.decrypt(configs);
        break;
    }
});