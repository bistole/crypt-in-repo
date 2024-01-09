const assert = require("assert");
const path = require("path");
const fs = require("fs");
const aes256 = require("aes256");
const crypt = require("../../src/libs/crypt");
const { sha256 } = require("js-sha256");

describe("crypt", () => {
    const config = {
        passphrase: "pass",
        ext: "._crypt",
        baseDir: path.join(__dirname, "..", "misc")
    };
    const sourceFile = path.join(__dirname, "..", "misc", "source.txt");

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

    describe("encrypt", () => {    
        it("origin file missing", (done) => {
            try {
                crypt.encryptFile("source.missing", config);
            } catch (e) {
                console.log(e);
                assert(e instanceof crypt.MissingFileError, "file should missing");
                return done();
            }
            done("Unexpected succ");
        });

        it("origin file exceed limit", (done) => {
            let newConfig = JSON.parse(JSON.stringify(config));
            newConfig.limitSize = 10;

            try {
                crypt.encryptFile("source.txt", newConfig);
            } catch (e) {
                console.log(e);
                assert(e instanceof crypt.FileSizeExceedLimitError, "file should exceed the limits");
                return done();
            }
            done("Unexpected succ");
        });

        it("encrypt twice got no changes message", (done) => {
            try {
                crypt.encryptFile("source.txt", config);
                const log = crypt.encryptFile("source.txt", config);
                const shouldHasLog = "source.txt has no changes.";
                assert(log === shouldHasLog, `\nshould say:\n ${shouldHasLog}\nbut say:\n ${log}`);
            } catch (e) {
                return done(e);
            }
            done();
        });

        it("encrypt with new pass", (done) => {
            const newConfig = JSON.parse(JSON.stringify(config));
            newConfig.passphrase = "newpass";
            try {
                crypt.encryptFile("source.txt", config);
                const log = crypt.encryptFile("source.txt", newConfig);
                const shouldHasLog = "source.txt is encrypted even got 'Incorrect passphrase'.";
                assert(log === shouldHasLog, `\nshould say:\n ${shouldHasLog}\nbut say:\n ${log}`);
            } catch (e) {
                return done(e);
            }
            done();
        });

        it("encrypted file is not encrypted", (done) => {
            try {
                crypt.encryptFile("source.txt", config);
                
                const buf = Buffer.from("CIR_" + "WHATEVER");
                fs.writeFileSync(sourceFile + "._crypt", buf);

                const log = crypt.encryptFile("source.txt", config);
                const shouldHasLog = "source.txt is encrypted even got 'Encrypted file is damaged'.";
                assert(log === shouldHasLog, `\nshould say:\n ${shouldHasLog}\nbut say:\n ${log}`);
            } catch (e) {
                return done(e);
            }
            done();
        });

        it("encrypted file malformatted", (done) => {
            try {
                crypt.encryptFile("source.txt", config);
                
                const buf = Buffer.from("CIR_" + "WHATEVER");
                var ciper = aes256.createCipher(config.passphrase);
                var encrypted = ciper.encrypt(buf);
                var encoded = Buffer.from(encrypted);
                fs.writeFileSync(sourceFile + "._crypt", encoded);

                const log = crypt.encryptFile("source.txt", config);
                const shouldHasLog = "source.txt is encrypted even got 'Encrypted file is damaged'.";
                assert(log === shouldHasLog, `\nshould say:\n ${shouldHasLog}\nbut say:\n ${log}`);
            } catch (e) {
                return done(e);
            }
            done();
        });

        it("encrypted file checksum is ruined", (done) => {
            try {
                crypt.encryptFile("source.txt", config);
                
                const raw = "WHATEVER";
                const checksum = sha256.hex(raw);
                const buf = Buffer.from("CIR_" + checksum + raw + "ONE_MORE");
                var ciper = aes256.createCipher(config.passphrase);
                var encrypted = ciper.encrypt(buf);
                var encoded = Buffer.from(encrypted);
                fs.writeFileSync(sourceFile + "._crypt", encoded);

                const log = crypt.encryptFile("source.txt", config);
                const shouldHasLog = "source.txt is encrypted even got 'Encrypted file is damaged'.";
                assert(log === shouldHasLog, `\nshould say:\n ${shouldHasLog}\nbut say:\n ${log}`);
            } catch (e) {
                return done(e);
            }
            done();
        });
    });

    describe("decrypt", () => {
        it("found same when decrypt", () => {
            crypt.encryptFile("source.txt", config);
            const log = crypt.decryptFile("source.txt", config);
            const shouldHasLog = "source.txt has no changes.";
            assert(log === shouldHasLog, `\nshould say:\n ${shouldHasLog}\nbut say:\n ${log}`);
        });
    });
});