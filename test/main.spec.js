const fs = require("fs");
const path = require("path");
const assert = require("assert");

const main = require("../src/main");

describe("main", () => {
    var config = {
        config: path.join(__dirname, "misc", "config.json"),
        baseDir: path.join(__dirname, ".."),
        passphrase: "mypass",
        files: ["./test/misc/source.txt"],
        ext: "._crypt",
    };

    const sourceFile = path.join(__dirname, "misc", "source.txt");

    beforeEach(() => {
        fs.copyFileSync(sourceFile + ".ORIGIN", sourceFile);
    });

    afterEach(() => {
        try {
            fs.unlinkSync(sourceFile);
        } catch (e) {
            // nothing
        }
        try {
            fs.unlinkSync(sourceFile + "._crypt");
        } catch (e) {
            // nothing
        }
        try {
            fs.unlinkSync(sourceFile + "._compare");
        } catch (e) {
            // nothing
        }
    });

    it("succ encrypt and decrypt", () => {
        // encrypt
        main.encrypt(config);

        // remove source
        fs.unlinkSync(sourceFile);

        // decrypt
        main.decrypt(config);
        assert(fs.existsSync(sourceFile), "decrypted file should exist");

        // compare
        const src = fs.readFileSync(sourceFile).toString();
        const ori = fs.readFileSync(sourceFile + ".ORIGIN").toString();
        assert(src === ori, "decrypted file is not same");
    });

    it("succ decrypt changed file", () => {
        // encrypt
        main.encrypt(config);

        fs.writeFileSync(sourceFile, "ORIGIN EXAMPLE WAS CHANGED");

        // decrypt
        main.decrypt(config);
        assert(fs.existsSync(sourceFile + "._compare"), "decrypted compare file should created");

        // which is same as origin one
        const src = fs.readFileSync(sourceFile + "._compare").toString();
        const ori = fs.readFileSync(sourceFile + ".ORIGIN").toString();
        assert(src === ori, "decrypted file is not same as origin one");
    });

    it("failed when using mis-matched passphrase", () => {
        // encrypt
        main.encrypt(config);

        // remove source
        fs.unlinkSync(sourceFile);

        // decrypt
        var newConfig = JSON.parse(JSON.stringify(config));
        newConfig.passphrase = "mismatch";
        main.decrypt(newConfig);

        assert(fs.existsSync(sourceFile) === false, "origin file should not be generated");
    });
});