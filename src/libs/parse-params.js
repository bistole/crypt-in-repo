const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const PACKGE_JSON_FILE = "package.json";
const DEFAULT_CONFIG_FILENAME = "crypt-in-repo.json";

const ENV_CONFIG = "CIR_CONFIG";
const ENV_PASSPHRASE = "CIR_PASS";
const ENV_FILES = "CIR_FILES";
const ENV_EXTENSION = "CIR_EXT";
const ENV_SIZELIMIT = "CIR_SIZELIMIT";

class FailedToLocateProjectHome extends Error {
    constructor() {
        super("Are you run this script in nodejs project? can not find package.json file.");
    }
}

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
        "type": "string",
    }
};

function getProjectHome() {
    let fullpath = process.env.PWD;
    if (fullpath.endsWith(path.sep)) {
        fullpath = fullpath.slice(0, -1);
    }

    let seg = fullpath.split(path.sep);
    while (seg.length > 0) {
        let v = path.sep + path.join(...seg, PACKGE_JSON_FILE);
        if (fs.existsSync(v)) {
            return path.sep + path.join(...seg);
        }
        seg = seg.splice(0, -1);
    }
    throw new FailedToLocateProjectHome();
}

function getConfigFilename(baseDir) {
    return path.sep + path.join(baseDir, DEFAULT_CONFIG_FILENAME);
}

function convertEnvVarToConfigs(env, priorityConfigs) {
    // console.log(env)
    let configs = {};
    Object.keys(configCliEnvMapping).forEach(configKey => {
        if (priorityConfigs[configKey] !== undefined && priorityConfigs[configKey] !== null) {
            configs[configKey] = priorityConfigs[configKey];
            return;
        }
        const envKey = configCliEnvMapping[configKey].env;
        if (envKey && env[envKey] !== undefined && env[envKey] !== null) {
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

function convertCliOptToConfigs(args, priorityConfigs) {
    // console.log(args)
    let configs = {};
    Object.keys(configCliEnvMapping).forEach(configKey => {
        if (priorityConfigs[configKey] !== undefined && priorityConfigs[configKey] !== null) {
            configs[configKey] = priorityConfigs[configKey];
            return;
        }

        const cliKey = configCliEnvMapping[configKey].cli;
        if (cliKey && args[cliKey] !== undefined && args[cliKey] !== null) {
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
    if (!configs[configProps.PROP_BASEDIR]) {
        configs[configProps.PROP_BASEDIR] = getProjectHome();
        console.log("base dir = " + configs[configProps.PROP_BASEDIR]);
    }
    configs = convertCliOptToConfigs(cliArgv, configs);
    configs = convertEnvVarToConfigs(process.env, configs);
    try {
        var configFile = getConfigFilename(configs[configProps.PROP_BASEDIR]);
        configs = readConfigs(configFile, configs);
        console.log(configs);
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

    // read config file
    var buffer = fs.readFileSync(configFile);
    var configs = {};
    try {
        configs = JSON.parse(buffer);
    } catch (e) {
        throw new Error(`Catch error when parse config file: ${configFile}: ${e}`);
    }
    
    // set property if not set
    Object.keys(configCliEnvMapping).forEach(configKey => {
        if (priorityConfigs[configKey] !== undefined && priorityConfigs[configKey] !== null) {
            return;
        }
        if (configs[configKey] !== undefined && configs[configKey] !== null) {
            if (configCliEnvMapping[configKey].type === "string" && typeof configs[configKey] !== "string") {
                throw new MalformatPropertyError(configKey, "should be a string");
            } else if (configCliEnvMapping[configKey].type === "number" && typeof configs[configKey] !== "number") {
                throw new MalformatPropertyError(configKey, "should be a number");
            } else if (configCliEnvMapping[configKey].type === "array" && !Array.isArray(configs[configKey])) {
                throw new MalformatPropertyError(configKey, "should be a array of filenames");
            }
            priorityConfigs[configKey] = configs[configKey];
        }
    });

    return priorityConfigs;
};

const validateConfigs = (configs, configFilename) => {
    // base dir
    const baseDir = configs[configProps.PROP_BASEDIR];
    if (typeof baseDir !== "string" || !fs.existsSync(baseDir)) {
        configs[configProps.PROP_BASEDIR] = getProjectHome();
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
    } else if (typeof ext !== "string" || ext.length === 0 || !ext.startsWith(".")) {
        throw new MalformatPropertyError(configProps.PROP_EXTENSION, "should be a string and start with .(dot)");
    }

    // limit
    const limit = configs[configProps.PROP_SIZELIMIT];
    if (limit == undefined || limit === null) {
        configs[configProps.PROP_SIZELIMIT] = configCliEnvMapping[configProps.PROP_SIZELIMIT].def;
    }
    return configs;
};

exports.readCommandline = readCommandline;
exports.validateConfigs = validateConfigs;
