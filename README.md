# crypt-in-repo

## 🛑 This npm is still in alpha stage.

Keep secret files in github repository could be safe as long as it is encrypted. `crypt-in-repo` is a helper for developer who need to save secret files with their code in a safe way.

The idea comes from [Fastlane Match](https://docs.fastlane.tools/actions/match/) who put certificates and profiles on github to share between teams.

## Install

```shell
$ npm i crypt-in-repo --save-dev
```

## Usage

Create config file `crypt-in-repo.json` in project root folder.

Here is an example:
```json
{
    "files": [
        "README.md",
        "key.cert",
        "cert/password.json"
    ],
    "ext": ".crypt"
}
```

Add script in package.json
```json
{
    "scripts": {
        "encrypt": "crypt-in-repo encrypt",
        "decrypt": "crypt-in-repo decrypt"
    }
}
```

Run the script:
```shell
# encrypt
CIR_PASS=<passphrase> npm run encrypt

# decrypt
CIR_PASS=<passphrase> npm run decrypt
```

### Example using command line

Encrypt files:

```shell
crypt-in-repo encrypt --pass password --file secret.cert ios.p12

crypt-in-repo encrypt --config crypt.json

```

Decrypt files:

```shell
crypt-in-repo decrypt --pass=password --file secret.cert ios.p12

crypt-in-repo decrypt --config=./crypt.json
```

### Example using environment variables

Encrypt files:

```shell
CIR_CONFIG=/path/to/crypt.json crypt-in-repo encrypt

CIR_PASS=password crypt-in-repo encrypt --file secret.cert ios.p12
```

Decrypt files:

```shell
CIR_CONFIG=/path/to/crypt.json crypt-in-repo decrypt

CIR_PASS=password crypt-in-repo decrypt --file secret.cert ios.p12
```

## Documents

Options can set in config file, command line or environment variables:

| Config file | Command line options | Env variable | Explain |
|---|---|---|---|
| pass  | --pass, -p              | CIR_PASS=passphase         | Passphrase for enrypt/decrypt file. |
| files | --file file1 [file2...]<sup>1</sup> | CIR_FILES=file1[;file2...]<sup>2</sup> | Array of origin files. |
| ext   | --ext                   | CIR_EXT=.crypt             | Extension of encrypted files. <br/>Default value: .aes256 |
| limit | --limit                 | CIR_LIMIT=1048576          | Limit size of origin file. <br/> Default value: 1048576 (1MB) |

Notes:
1. Assign file list in command line follow the [yargs array(key)](https://yargs.js.org/docs/#api-reference-arraykey) standards:

    - `--file file1 --file file2` will be parsed as `['file1','file2']`
    - `--file file1 file2` will also be parsed as `['file1','file2]`

2. Assign file list in env variable, the filename should seperated by `;`.

`crypt-in-repo` can assign config file other than default `crypt-in-repo.json`. With command line options `--config config_file`

`crypt-in-repo`  `--config config_file` to get config file. System environment variable `CIR_CONFIG` has the same functionality.



## TODO

Work with pre-commit, so the encrypted file will replace the origin files in commit.


## License

Copyright (c) 2021, Shizheng Ding (MIT License)