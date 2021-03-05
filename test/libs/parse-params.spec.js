const assert = require("assert");
const path = require("path");
const parseParams = require("../../src/libs/parse-params");

describe("parse-params", () => {
    describe("parse", () => {
        it("parse command line", (done) => {
            const argv = [
                "node", "crypt-in-repo", "encrypt",
                "--pass", "mypass", "--file", "./source.txt",
            ];
            const cwd = process.cwd();
    
            parseParams.readCommandline(argv, (cmd, conf) => {
                assert(cmd === "encrypt", "Command should be encrypt");
                assert(conf.baseDir === cwd, "Incorrect base dir");
                assert(conf.config === cwd + path.sep + "crypt-in-repo.json", "Incorrect config file");
                assert(conf.passphrase === "mypass", "Incorrect passphrase");
                assert(conf.files.length === 1, "Incorrect files number");
                assert(conf.files[0] === "./source.txt", "Incorrect filename");
                done();
            });
        });
    
        it("parse command line with config file", (done) => {
            const argv = [
                "node", "crypt-in-repo", "decrypt",
                "--config", "./test/misc/config.json",
            ];
            const cwd = process.cwd();
            parseParams.readCommandline(argv, (cmd, conf) => {
                assert(cmd === "decrypt", "Command should be decrypt");
                assert(conf.baseDir === cwd, "Incorrect base dir");
                assert(conf.config === "./test/misc/config.json", "Incorrect config file");
                assert(conf.passphrase === "from_config", "Incorrect passphrase");
                assert(conf.ext === ".crypt_by_config", "Incorrect extension");
                assert(conf.files.length === 1, "Incorrect files number");
                assert(conf.files[0] === "source_by_config.cert", "Incorrect filename");
                done();
            });
        });
    
        it("parse environment variables", (done) => {
            process.env.CIR_PASS = "crypt_by_env";
            process.env.CIR_FILES = "source_by_config.cert";
            process.env.CIR_EXT = ".crypt_by_env";
            process.env.CIR_SIZELIMIT = "887766";
    
            const argv = [
                "node", "crypt-in-repo", "encrypt",
            ];
            const cwd = process.cwd();
            parseParams.readCommandline(argv, (cmd, conf) => {
                assert(cmd === "encrypt", "Command should be encrypt");
                assert(conf.baseDir === cwd, "Incorrect base dir");
                assert(conf.config === cwd + path.sep + "crypt-in-repo.json", "Incorrect config file");
                assert(conf.passphrase === "crypt_by_env", "Incorrect passphrase");
                assert(conf.ext === ".crypt_by_env", "Incorrect extension");
                assert(conf.sizeLimit === 887766, "Incorrect limit");
                assert(conf.files.length === 1, "Incorrect files number");
                assert(conf.files[0] === "source_by_config.cert", "Incorrect filename");
                done();
            });
        });
    });
});
