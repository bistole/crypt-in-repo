# crypt-in-repo

## 🛑 This npm is still in alpha stage.


Encrypt files in repo if necessary.

Keep encrypted secret files on github is safe and easy to maintain.

Just don't forget encrypt before commit into repo.

## Install

```shell
$ npm i crypt-in-repo --save-dev
```

## Usage

Create a json config file `crypt-in-repo.json` in project folder.

Here is an example:
```json
{
    "files": [
        "README.md",
        "key.cert",
        "cert/password.json"
    ],
}
```

Put Script in package.json
```json
{
    "scripts": {
        "crypt-in-repo": "npm run crypt-in-repo"
    }
}
```

Run the script:
```shell
npm run crypt-in-repo encrypt
npm run crypt-in-repo decrypt
```

### Example using command lines

Encode:

```shell
crypt-in-repo encrypt --config <configfile>
crypt-in-repo encrypt --pass <passphrase> --file file1 file2 file3
```

Decode:
```shell
crypt-in-repo decrypt --config <configfile>
crypt-in-repo decrypt --pass <passphrase> --file file1 file2 file3
```

### Example using environment variables

Encode:
```shell
CIR_CONFIG=<configfile> crypt-in-repo encrypt
CIR_PASS=<passphrase> crypt-in-repo encrypt --file file1 file2 file3
CIR_PASS=<passphrase> CIR_FILE=file1;file2;file3 crypt-in-repo encrypt
```

Decode
```shell
CIR_CONFIG=<configfile> crypt-in-repo decrypt
CIR_PASS=<passphrase> crypt-in-repo decrypt --file file1 file2 file3
CIR_PASS=<passphrase> CIR_FILE=file1;file2;file3 crypt-in-repo decrypt
```

## Documents

Will do when get a chance.

## TODO

Work with pre-commit, so the encrypted file will replace the origin files in commit.


## License

Copyright (c) 2021, Shizheng Ding (MIT License)