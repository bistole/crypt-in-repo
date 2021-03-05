const fs = require("fs");
const path = require("path");
const aes256 = require("aes256");
const base64 = require("js-base64");
const sha256 = require("js-sha256");

exports.checkFile = (filename, conf) => {
    var fullpath = path.join(conf.baseDir, filename);
    var stat = fs.statSync(fullpath);
    if (stat === undefined) {
        throw new Error(`${filename} is not existed`);
    }
    if (stat.size > conf.limitSize) {
        throw new Error(`${filename} is exceed the file size limits.`);
    }
};

exports.encryptFile = (filename, conf) => {
    var fullpath = path.join(conf.baseDir, filename);
    var cryptfullpath = path.join(conf.baseDir, filename + conf.ext);
    
    var ciper = aes256.createCipher(conf.passphrase);
    var origin = fs.readFileSync(fullpath);
    var encrypted = ciper.encrypt(origin);
    var encoded = base64.btoa(encrypted);
    fs.writeFileSync(cryptfullpath, encoded);
};

exports.decryptFile = (filename, conf) => {
    var fullpath = path.join(conf.baseDir, filename);
    var cryptfullpath = path.join(conf.baseDir, filename + conf.ext);
    var ciper = aes256.createCipher(conf.passphrase);

    var encoded = fs.readFileSync(cryptfullpath).toString();
    var encrypted = Buffer.from(base64.atob(encoded), "binary");
    var origin = ciper.decrypt(encrypted);

    // compare if it is same
    if (!fs.existsSync(fullpath)) {
        fs.writeFileSync(fullpath, origin);
        console.log(`Rebuild new file: ${filename}`);
    } else {
        var current = fs.readFileSync(fullpath);
        var hashOrigin = sha256.hex(origin);
        var hashCurrent = sha256.hex(current);

        if (hashCurrent === hashOrigin) {
            console.log(`${filename} has no changes`);
        } else {
            console.log(`${filename} was changes, original one is saves as ${filename}.compare`);
            fs.writeFileSync(fullpath  + ".compare", origin);
        }
    }
};