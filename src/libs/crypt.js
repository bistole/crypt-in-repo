const fs = require("fs");
const path = require("path");
const aes256 = require("aes256");
const base64 = require("js-base64");
const sha256 = require("js-sha256");

const CHECKSUM = "CIR_";

class IncorrectPassphraseError extends Error {
    constructor() {
        super("Incorrect passphrase");
    }
}

class MissingFileError extends Error {
    constructor(filename) {
        super(`File not exists: ${filename}`);
    }
}

class FileSizeExceedLimitError extends Error {
    constructor(filename) {
        super(`File is too big to encrypt: ${filename}`);
    }
}

exports.IncorrectPassphraseError = IncorrectPassphraseError;
exports.MissingFileError = MissingFileError;
exports.FileSizeExceedLimitError = FileSizeExceedLimitError;

exports.encryptFile = (filename, conf) => {
    var fullpath = path.join(conf.baseDir, filename);
    var cryptfullpath = path.join(conf.baseDir, filename + conf.ext);

    var stat = fs.statSync(fullpath);
    if (stat === undefined) {
        throw new MissingFileError(fullpath);
    }
    if (stat.size > conf.limitSize) {
        throw new FileSizeExceedLimitError(fullpath);
    }
    
    var ciper = aes256.createCipher(conf.passphrase);
    var origin = Buffer.concat([Buffer.from(CHECKSUM), fs.readFileSync(fullpath)]);
    var encrypted = ciper.encrypt(origin);
    var encoded = base64.btoa(encrypted);
    fs.writeFileSync(cryptfullpath, encoded);
};

exports.decryptFile = (filename, conf) => {
    var fullpath = path.join(conf.baseDir, filename);
    var cryptfullpath = path.join(conf.baseDir, filename + conf.ext);
    if (!fs.existsSync(cryptfullpath)) {
        throw new MissingFileError(cryptfullpath);
    }

    var ciper = aes256.createCipher(conf.passphrase);

    var encoded = fs.readFileSync(cryptfullpath).toString();
    var encrypted = Buffer.from(base64.atob(encoded), "binary");
    var origin = ciper.decrypt(encrypted);

    if (origin.slice(0, CHECKSUM.length).toString() !== CHECKSUM) {
        throw new IncorrectPassphraseError();
    }

    // compare if it is same
    if (!fs.existsSync(fullpath)) {
        fs.writeFileSync(fullpath, origin.slice(CHECKSUM.length));
        return `Rebuild new file: ${filename}`;
    } else {
        var current = fs.readFileSync(fullpath);
        var hashOrigin = sha256.hex(origin.slice(CHECKSUM.length));
        var hashCurrent = sha256.hex(current);

        if (hashCurrent === hashOrigin) {
            return `${filename} has no changes`;
        } else {
            fs.writeFileSync(fullpath  + "._compare", origin.slice(CHECKSUM.length));
            return `${filename} was changes, original one is saves as ${filename}._compare`;
        }
    }
};