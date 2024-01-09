const fs = require("fs");
const path = require("path");
const aes256 = require("aes256");
const sha256 = require("js-sha256");

const HEADER = "CIR_";
const CHECKSUM_HEX_LEN = 64;    // in hex string

class IncorrectPassphraseError extends Error {
    constructor() {
        super("Incorrect passphrase");
    }
}
class FileDamagedError extends Error {
    constructor() {
        super("Encrypted file is damaged");
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
exports.FileDamagedError = FileDamagedError;
exports.MissingFileError = MissingFileError;
exports.FileSizeExceedLimitError = FileSizeExceedLimitError;

function readEncrypedFile(fullpath, passphrase) {
    if (!fs.existsSync(fullpath)) {
        throw new MissingFileError(fullpath);
    }
    var ciper = aes256.createCipher(passphrase);

    var encoded = fs.readFileSync(fullpath).toString();
    var encrypted = Buffer.from(encoded, "base64");

    try {
        var origin = ciper.decrypt(encrypted);
    } catch (e) {
        throw new FileDamagedError();
    }

    if (origin.length < HEADER.length + CHECKSUM_HEX_LEN) {
        throw new FileDamagedError();
    }

    if (origin.slice(0, HEADER.length).toString() !== HEADER) {
        throw new IncorrectPassphraseError();
    }

    var originChecksum = origin.slice(HEADER.length, HEADER.length + CHECKSUM_HEX_LEN).toString();
    var originBody = origin.slice(HEADER.length + CHECKSUM_HEX_LEN);

    var originGenChecksum = sha256.hex(originBody);
    if (originChecksum !== originGenChecksum) {
        throw new FileDamagedError();
    }

    return {checksum: originChecksum, body: originBody};
}

exports.encryptFile = (filename, conf) => {
    
    var fullpath = path.join(conf.baseDir, filename);
    var cryptfullpath = path.join(conf.baseDir, filename + conf.ext);

    var stat;
    try {
        stat = fs.statSync(fullpath);
    } catch (e) {
        throw new MissingFileError(fullpath);
    }

    if (stat.size > conf.limitSize) {
        throw new FileSizeExceedLimitError(fullpath);
    }    

    var body = fs.readFileSync(fullpath);
    var checksum = sha256.hex(body);
    var encryptedFile;

    var even;
    try {
        encryptedFile = readEncrypedFile(cryptfullpath, conf.passphrase);
    } catch (e) {
        if (!(e instanceof MissingFileError)) {
            even = e.message;
            console.warn(e.message);
        }
        encryptedFile = null;
    }

    if (encryptedFile !== null && encryptedFile.checksum === checksum) {
        return `${filename} has no changes.`;
    }

    var ciper = aes256.createCipher(conf.passphrase);
    var origin = Buffer.concat([Buffer.from(HEADER), Buffer.from(checksum, "ascii"), body]);
    var encrypted = ciper.encrypt(origin);
    var encoded = Buffer.from(encrypted, "binary").toString("base64");
    fs.writeFileSync(cryptfullpath, encoded);
    return `${filename} is encrypted` + (even ? ` even got '${even}'.` : ".") ;
};

exports.decryptFile = (filename, conf) => {
    var fullpath = path.join(conf.baseDir, filename);
    var cryptfullpath = path.join(conf.baseDir, filename + conf.ext);

    var encryptedFile = readEncrypedFile(cryptfullpath, conf.passphrase);
    
    // compare if it is same
    if (!fs.existsSync(fullpath)) {
        fs.writeFileSync(fullpath, encryptedFile.body);
        return `Rebuild new file: ${filename}.`;
    } else {
        var current = fs.readFileSync(fullpath);
        var hashCurrent = sha256.hex(current);

        if (hashCurrent === encryptedFile.checksum) {
            return `${filename} has no changes.`;
        } else {
            fs.writeFileSync(fullpath  + "._compare", encryptedFile.body);
            return `${filename} was changes, original one is saves as ${filename}._compare.`;
        }
    }
};