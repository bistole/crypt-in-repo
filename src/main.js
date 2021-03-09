var parseParams = require("./libs/parse-params");
var crypt = require("./libs/crypt");

exports.encrypt = function( configs ) {
    configs = parseParams.validateConfigs(configs);
    configs.files.forEach(file => {
        try {
            var log = crypt.encryptFile(file, configs);
            console.log(log);
        } catch (e) {
            console.error(e);
        }
    });
};

exports.decrypt = function( configs ) {
    configs = parseParams.validateConfigs(configs);
    try {
        configs.files.forEach(file => {
            try {
                var log = crypt.decryptFile(file, configs);
                console.log(log);
            } catch (e) {
                if (e instanceof crypt.IncorrectPassphraseError) {
                    throw e;
                }
                console.error(e);
            }
        });
    } catch (e) {
        console.error("Decrypt is not finished because of the following error:");
        console.error(e);
    }
};
