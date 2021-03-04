const fs = require("fs");
const path = require("path");
const aes256 = require("aes256");
const base64 = require("js-base64");

exports.checkFile = (filename, conf) => {
    var fullpath = path.join(conf.appDir, filename);
    var stat = fs.statSync(fullpath);
    if (stat === undefined) {
        throw new Error(`${filename} is not existed`);
    }
    if (stat.size > conf.limitSize) {
        throw new Error(`${filename} is exceed the file size limits.`);
    }
};

exports.encryptFile = (filename, conf) => {
    var fullpath = path.join(conf.appDir, filename);
    var cryptfullpath = path.join(conf.appDir, filename + conf.fileExtension);
    
    var ciper = aes256.createCipher(conf.passphrase);
    var origin = fs.readFileSync(fullpath);
    var encrypted = ciper.encrypt(origin);
    var encoded = base64.btoa(encrypted);
    fs.writeFileSync(cryptfullpath, encoded);
};

exports.decryptFile = (filename, conf) => {
    var fullpath = path.join(conf.appDir, filename);
    var cryptfullpath = path.join(conf.appDir, filename + ".aes256");
    var ciper = aes256.createCipher(conf.passphrase);

    var encoded = fs.readFileSync(cryptfullpath).toString();
    var encrypted = Buffer.from(base64.atob(encoded), "binary");
    var origin = ciper.decrypt(encrypted);
    fs.writeFileSync(fullpath, origin);
};