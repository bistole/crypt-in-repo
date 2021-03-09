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
    
            parseParams.readCommandline(argv, (err, cmd, conf) => {
                assert(err === null);
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
            parseParams.readCommandline(argv, (err, cmd, conf) => {
                assert(err === null);
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
            parseParams.readCommandline(argv, (err, cmd, conf) => {
                assert(err === null);
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

    describe("parse with error", () => {
        let backupPWD;
        beforeEach(() => {
            backupPWD = process.env.PWD;
            delete process.env.CIR_CONFIG;
            delete process.env.CIR_PASS;
        });

        afterEach(() => {
            process.env.PWD = backupPWD;
            delete process.env.CIR_CONFIG;
            delete process.env.CIR_PASS;
        });

        it("config file not exist", (done) => {
            process.env.PWD = "/usr";
            const argv = ["node", "crypt-in-repo", "encrypt"];
            parseParams.readCommandline(argv, (err) => {
                assert(err instanceof parseParams.FailedToLocateProjectHome, "should missing home folder");
                done();
            });
        });

        it("assign config in env, but failed to parse", (done) => {
            const dummyFile = path.join(__dirname, "..", "..", "LICENSE");
            process.env.CIR_CONFIG = dummyFile;
            process.env.CIR_PASS = "env_pass";
            const argv = ["node", "crypt-in-repo", "encrypt"];
            parseParams.readCommandline(argv, (err) => {
                console.log(err);
                assert(err instanceof parseParams.MalformatConfigFileError, "should missing home folder");
                done();
            });
        });
    });

    describe("validate", () => {
        it("validate without baseDir", (done) => {
            process.env.PWD = "/usr/";
            var config = {};
            try {
                parseParams.validateConfigs(config);
            } catch (e) {
                if (!(e instanceof parseParams.FailedToLocateProjectHome)) {
                    return done(e);
                }
                return done();
            }
            done("Unexpected succ");
        });

        it("validate without pass", (done) => {
            var config = {
                baseDir: __dirname,
            };
            try {
                parseParams.validateConfigs(config);
            } catch (e) {
                if (!(e instanceof parseParams.MissingPropertyError)) {
                    return done(e);
                }
                assert(e.message.indexOf("passphrase") !== -1, "Should say passphrase is missing");
                return done();
            }
            done("Unexpected succ");
        });

        it("validate with malformat pass", (done) => {
            var config = {
                baseDir: __dirname,
                passphrase: 12345,
            };
            try {
                parseParams.validateConfigs(config);
            } catch (e) {
                if (!(e instanceof parseParams.MalformatPropertyError)) {
                    return done(e);
                }
                assert(e.message.indexOf("passphrase") !== -1, "Should say passphrase");
                assert(e.message.indexOf("should be a string") !== -1, "Should say be a string");
                return done();
            }
            done("Unexpected succ");
        });

        it("validate without files", (done) => {
            var config = {
                baseDir: __dirname,
                passphrase: "mypass",
            };
            try {
                parseParams.validateConfigs(config);
            } catch (e) {
                if (!(e instanceof parseParams.MissingPropertyError)) {
                    return done(e);
                }
                assert(e.message.indexOf("files") !== -1, "Should say files is malformat");
                return done();
            }
            done("Unexpected succ");
        });

        it("validate with malformatted ext", (done) => {
            var config = {
                baseDir: __dirname,
                passphrase: "mypass",
                files: ["source.txt"],
                ext: "no dot"
            };
            try {
                parseParams.validateConfigs(config);
            } catch (e) {
                if (!(e instanceof parseParams.MalformatPropertyError)) {
                    return done(e);
                }
                assert(e.message.indexOf("ext:") !== -1, "Should say ext is malformat");
                assert(e.message.indexOf("start with .(dot)") !== -1, "Should say start with dot");
                return done();
            }
            done("Unexpected succ");
        });

        it("validate with malformatted ext", (done) => {
            var config = {
                baseDir: __dirname,
                passphrase: "mypass",
                files: ["source.txt"],
                sizeLimit: "wrong format",
            };
            try {
                parseParams.validateConfigs(config);
            } catch (e) {
                if (!(e instanceof parseParams.MalformatPropertyError)) {
                    return done(e);
                }
                assert(e.message.indexOf("sizeLimit:") !== -1, "Should say limit is malformat");
                assert(e.message.indexOf("be a number") !== -1, "Should say be a number");
                return done();
            }
            done("Unexpected succ");
        });
    });
});
