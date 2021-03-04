const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const DEFAULT_CONFIG_FILENAME = "crypt-in-repo.json";

const ENV_CONFIG = "CIR_CONFIG";
const ENV_PASSPHRASE = "CIR_PASS";
const ENV_FILES = "CIR_FILES";
const ENV_EXTENSION = "CIR_EXT";
const ENV_SIZELIMIT = "CIR_SIZELIMIT";

class MissingPropertyError extends Error {
    constructor(propName, configFilename) {
        super(`Property '${propName}' is not defined in ${configFilename}, \n`
            + ` or add option --'${configCliEnvMapping[propName].cli}' when using command line, \n`
            + ` or set environment variable: ${configCliEnvMapping[propName].env}\n`);
    }
}

class MissingConfigFileError extends Error {
    constructor(configFilename) {
        super(`Can't find ${configFilename},\n`
            + `you can add ${DEFAULT_CONFIG_FILENAME} in project home folder,\n`
            + " or add option '--config' when using command line,\n"
            + " or set environment variable: 'CIR_CONFIG'\n");
    }
}

class MalformatPropertyError extends Error {
    constructor(propName, message) {
        super(`${propName}: ${message}`);
    }
}

const configProps = {
    PROP_CONFIG: "config",
    PROP_PASS: "passphrase",
    PROP_FILES: "files",
    PROP_EXTENSION: "ext",
    PROP_BASEDIR: "baseDir",
    PROP_SIZELIMIT: "sizeLimit"
};

const configCliEnvMapping = {
    [configProps.PROP_PASS]: {
        "env": ENV_PASSPHRASE,
        "cli": "pass",
        "type": "string"
    },
    [configProps.PROP_FILES]: {
        "env": ENV_FILES,
        "cli": "file",
        "type": "array"
    },
    [configProps.PROP_EXTENSION]: {
        "env": ENV_EXTENSION,
        "cli": "ext",
        "type": "string",
        "def": ".aes256"
    },
    [configProps.PROP_SIZELIMIT]: {
        "env": ENV_SIZELIMIT,
        "cli": "limit",
        "type": "number",
        "def": 1048576
    },
    [configProps.PROP_BASEDIR]: {
        "cli": "."
    }
};

const getDefaultConfigFile = () => {
    var appDir = path.dirname(require.main.filename);
    var configFile = path.join(appDir, DEFAULT_CONFIG_FILENAME);
    return configFile;
};

function convertEnvVarToConfigs(env, priorityConfigs) {
    // console.log(env)
    let configs = {};
    Object.keys(configCliEnvMapping).forEach(configKey => {
        if (priorityConfigs[configKey] !== undefined && priorityConfigs[configKey] !== null) {
            configs[configKey] = priorityConfigs[configKey];
            return;
        }
        const envKey = configCliEnvMapping[configKey].env;
        if (env[envKey] !== undefined && env[envKey] !== null) {
            const type = configCliEnvMapping[configKey].type;
            if (type == "string") {
                configs[configKey] = env[envKey];
            } else if (type === "number") {
                configs[configKey] = +env[envKey];
            } else if (type === "array") {
                configs[configKey] = env[envKey].split(";");
            }
        }
    });
    if (typeof env[ENV_CONFIG] === "string") {
        configs = readConfigs(env[ENV_CONFIG], configs);
    }
    return configs;
}

function convertCliOptToConfigs(args) {
    // console.log(args)
    let configs = {};
    Object.keys(configCliEnvMapping).forEach(configKey => {
        const cliKey = configCliEnvMapping[configKey].cli;
        if (args[cliKey] !== undefined && args[cliKey] !== null) {
            configs[configKey] = args[cliKey];
        }
    });
    // read config file set in command line before parse environment
    if (typeof args.config === "string") {
        configs = readConfigs(args.config, configs);
    }
    return configs;
}

function combineConfigs(cliArgv) {
    let configs = {};
    configs = convertCliOptToConfigs(cliArgv);
    configs = convertEnvVarToConfigs(process.env, configs);
    try {
        configs = readConfigs(getDefaultConfigFile(), configs);
    } catch (e) {
        // suppress only when config is set by env or cli
        if (!(e instanceof MissingConfigFileError) || Object.keys(configs).length === 0) {
            throw e;
        }
    }
    return configs;
}

const readCommandline = (argv, cb) => {
    yargs(process.argv.slice(2))
        .usage("Usage: $0 <command> [options]")
        .command("encrypt", "Encrypt files", (yargs) => {
            return yargs
                .usage("Usage: $0 encrypt [options]")
                .help("help")
                .argv;
        }, (newArgv) => {
            newArgv.base = "./";
            cb("encrypt", combineConfigs(newArgv));
        })
        .command("decrypt", "Decrypt files", (yargs) => {
            return yargs
                .usage("Usage: $0 decrypt [options]")
                .help("help")
                .argv;
        }, (newArgv) => {
            newArgv.base = "./";
            cb("decrypt", combineConfigs(newArgv));
        })
        .option("config", {
            describe: "config file",
            type: "string",
            global: true,
        })
        .option("ext", {
            alias: "e",
            describe: "encrypted file's extensions, default: "
                + configCliEnvMapping[configProps.PROP_EXTENSION].def,
            type: "string",
            global: true,
        })
        .option("file", {
            alias: "f",
            type: "array",
            describe: "file to encrypt/decrypt",
            global: true,
        })
        .option("pass", {
            alias: "p",
            describe: "passphrase to encrypt/decrypt files",
            type: "string",
            global: true,
        })
        .option("limit", {
            describe: "size limit of files to encrypt in bytes, default: "
                + configCliEnvMapping[configProps.PROP_SIZELIMIT].def,
            type: "number",
            global: true,
        })
        .demandCommand(1, "Do you want encrypt/decrypt the files in repo?")
        .help("help")
        .wrap(null)
        .argv;
};

const readConfigs = (configFile, priorityConfigs) => {
    if (!fs.existsSync(configFile)) {
        throw new MissingConfigFileError(configFile);
    }

    var buffer = fs.readFileSync(configFile);
    var configs = {};
    try {
        configs = JSON.parse(buffer);
    } catch (e) {
        throw new Error(`Catch error when parse config file: ${configFile}: ${e}`);
    }

    // base dir
    if (!priorityConfigs[configProps.PROP_BASEDIR]) {
        var baseDir = path.dirname(require.main.filename);
        configs[configProps.PROP_BASEDIR] = baseDir;    
    }

    // file extension
    configs[configProps.PROP_EXTENSION] = configs[configProps.PROP_EXTENSION] || ".aes256";
    if (!configs[configProps.PROP_EXTENSION].startsWith(".")) {
        configs[configProps.PROP_EXTENSION] = "." + configs[configProps.PROP_EXTENSION];
    }

    return configs;
};

const validateConfigs = (configs, configFilename) => {
    // base dir
    const baseDir = configs[configProps.PROP_BASEDIR];
    if (baseDir === undefined || baseDir === null) {
        configs[configProps.PROP_BASEDIR] = path.dirname(require.main.filename);
    } else if (typeof baseDir !== "string" || !fs.existsSync(baseDir)) {
        throw new Error(`project home is not set properly or not existed: ${baseDir}`);
    }

    // passphrase
    const passphrase = configs[configProps.PROP_PASS];
    if (passphrase === undefined || passphrase === null) {
        throw new MissingPropertyError(configProps.PROP_PASS, configFilename);
    }
    
    // files
    if (!Array.isArray(configs[configProps.PROP_FILES]) || configs[configProps.PROP_FILES].length === 0) {
        throw new MissingPropertyError(configProps.PROP_FILES, configFilename);
    }

    // extension
    const ext = configs[configProps.PROP_EXTENSION];
    if (ext === undefined || ext === null) {
        configs[configProps.PROP_EXTENSION] = configCliEnvMapping[configProps.PROP_EXTENSION].def;
    }
    if (typeof ext !== "string" || ext.length === 0 || !ext.startsWith(".")) {
        throw new MalformatPropertyError(configProps.PROP_EXTENSION, "should be a string and start with .(dot)");
    }

    // limit
    const limit = configs[configProps.PROP_SIZELIMIT];
    if (limit == undefined || limit === null) {
        configs[configProps.PROP_SIZELIMIT] = configCliEnvMapping[configProps.PROP_SIZELIMIT].def;
    }
};

exports.readCommandline = readCommandline;
exports.validateConfigs = validateConfigs;
