var parseParams = require("./libs/parse-params");
var crypt = require("./libs/crypt");

exports.encrypt = function( configs ) {
    parseParams.validateConfigs(configs);
    parseParams.files.forEach(file => {
        crypt.encryptFile(file, configs);
    });
};

exports.decrypt = function( configs ) {
    parseParams.validateConfigs(configs);
    parseParams.files.forEach(file => {
        crypt.decryptFile(file, configs);
    });
};
