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

class MalformatConfigFileError extends Error {
    constructor(configFilename) {
        super(`Config file '${configFilename}' is not a json formatted file`);
    }
}

class MissingPropertyError extends Error {
    constructor(propName, configFilename) {
        super(`Property '${propName}' is not defined. \n`
            + ` add property '${propName}' in config file ${configFilename ? "'"+configFilename+"'" : ""}, \n`
            + ` or add option --${configCliEnvMapping[propName].cli}\n`
            + ` or set environment variable: ${configCliEnvMapping[propName].env} when using command line.\n`);
    }
}

class MissingConfigFileError extends Error {
    constructor(configFilename) {
        super(`Can't find ${configFilename},\n`
            + `you can add ${DEFAULT_CONFIG_FILENAME} in project home folder,\n`
            + " or add option '--config' to assign a config file in command line,\n"
            + " or set environment variable: 'CIR_CONFIG'.\n");
    }
}

class MalformatPropertyError extends Error {
    constructor(propName, message) {
        super(`${propName}: ${message}`);
    }
}

exports.FailedToLocateProjectHome = FailedToLocateProjectHome;
exports.MissingConfigFileError = MissingConfigFileError;
exports.MalformatConfigFileError = MalformatConfigFileError;
exports.MissingPropertyError = MissingPropertyError;
exports.MalformatPropertyError = MalformatPropertyError;

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
    },
    [configProps.PROP_CONFIG]: {
        "type": "string",
    },
};

function getProjectHome() {
    let fullpath = process.env.PWD;
    if (fullpath.endsWith(path.sep)) {
        fullpath = fullpath.slice(0, -1);
    }

    let seg = fullpath.split(path.sep);
    while (seg.length > 1) {
        let v = path.sep + path.join(...seg, PACKGE_JSON_FILE);
        if (fs.existsSync(v)) {
            return path.sep + path.join(...seg);
        }
        seg = seg.splice(0, -1);
    }
    throw new FailedToLocateProjectHome();
}

function getConfigFilename(baseDir) {
    return path.join(baseDir, DEFAULT_CONFIG_FILENAME);
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
        // console.log(`from env: ${env[ENV_CONFIG]}`)
        configs[configProps.PROP_CONFIG] = env[ENV_CONFIG];
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
        // console.log(`from cli: ${args.config}`)
        configs[configProps.PROP_CONFIG] = args.config;
        configs = readConfigs(args.config, configs);
    }
    return configs;
}

function combineConfigs(command, cliArgv, cb) {
    let isDefConfig = false;
    let configs = {};
    try {
        configs[configProps.PROP_BASEDIR] = getProjectHome();
        configs = convertCliOptToConfigs(cliArgv, configs);
        configs = convertEnvVarToConfigs(process.env, configs);
        if (!configs[configProps.PROP_CONFIG]) {
            // default config can be missing if properties is loaded
            var configFile = getConfigFilename(configs[configProps.PROP_BASEDIR]);
            // console.log(`from default: ${configFile}`)
            configs[configProps.PROP_CONFIG] = configFile;
            isDefConfig = true;
            configs = readConfigs(configFile, configs);
        }
    } catch (e) {
        // suppress only when config is set by env or cli
        if (!(e instanceof MissingConfigFileError && isDefConfig) || Object.keys(configs).length === 0) {
            return cb(e);
        }
    }
    return cb(null, command, configs);
}

function readCommandline(argv, cb) {
    yargs(argv.slice(2))
        .usage("Usage: $0 <command> [options]")
        .command("encrypt", "Encrypt files", (yargs) => {
            return yargs
                .usage("Usage: $0 encrypt [options]")
                .help("help")
                .argv;
        }, (newArgv) => {
            combineConfigs("encrypt", newArgv, cb);
        })
        .command("decrypt", "Decrypt files", (yargs) => {
            return yargs
                .usage("Usage: $0 decrypt [options]")
                .help("help")
                .argv;
        }, (newArgv) => {
            combineConfigs("decrypt", newArgv, cb);
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
}

function readConfigs(configFile, priorityConfigs) {
    if (!fs.existsSync(configFile)) {
        throw new MissingConfigFileError(configFile);
    }

    // read config file
    var buffer = fs.readFileSync(configFile);
    var configs = {};
    try {
        configs = JSON.parse(buffer);
    } catch (e) {
        throw new MalformatConfigFileError(configFile);
    }
    
    // set property if not set
    Object.keys(configCliEnvMapping).forEach(configKey => {
        if (priorityConfigs[configKey] !== undefined && priorityConfigs[configKey] !== null) {
            return;
        }
        if (configs[configKey] !== undefined && configs[configKey] !== null) {
            priorityConfigs[configKey] = configs[configKey];
        }
    });

    return priorityConfigs;
}

function validateConfigs(configs) {
    // console.log(configs);

    // base dir
    const baseDir = configs[configProps.PROP_BASEDIR];
    if (typeof baseDir !== "string" || !fs.existsSync(baseDir)) {
        configs[configProps.PROP_BASEDIR] = getProjectHome();
    }

    // passphrase
    const passphrase = configs[configProps.PROP_PASS];
    if (passphrase === undefined || passphrase === null) {
        throw new MissingPropertyError(configProps.PROP_PASS, configs[configProps.PROP_CONFIG]);
    } else if (typeof passphrase !== "string") {
        throw new MalformatPropertyError(configProps.PROP_PASS, "should be a string");
    }
    
    // files
    if (!Array.isArray(configs[configProps.PROP_FILES]) || configs[configProps.PROP_FILES].length === 0) {
        throw new MissingPropertyError(configProps.PROP_FILES, configs[configProps.PROP_CONFIG]);
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
    } else if (typeof limit !== "number") {
        throw new MalformatPropertyError(configProps.PROP_SIZELIMIT, "should be a number");
    }
    return configs;
}

exports.readCommandline = readCommandline;
exports.validateConfigs = validateConfigs;
