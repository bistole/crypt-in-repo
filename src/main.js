var parseParams = require("./libs/parse-params");
var crypt = require("./libs/crypt");

exports.encrypt = function( configs ) {
    configs = parseParams.validateConfigs(configs);
    configs.files.forEach(file => {
        crypt.encryptFile(file, configs);
    });
};

exports.decrypt = function( configs ) {
    configs = parseParams.validateConfigs(configs);
    configs.files.forEach(file => {
        crypt.decryptFile(file, configs);
    });
};
