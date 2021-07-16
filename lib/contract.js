"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKeyPairFromSeed = exports.deployContract = exports.compileContract = void 0;
const fs = __importStar(require("fs"));
const kleur = __importStar(require("kleur"));
const path = __importStar(require("path"));
const child = __importStar(require("child_process"));
const helper_1 = require("./helper");
const signer_1 = require("@taquito/signer");
const taquito_1 = require("@taquito/taquito");
const bs58check = __importStar(require("bs58check"));
const sodium = require('libsodium-wrappers');
function compileContract() {
    return __awaiter(this, void 0, void 0, function* () {
        yield new Promise((resolve, reject) => 
        // Compile the contract
        child.exec(path.join(__dirname, "../ligo/exec_ligo compile-contract " + path.join(__dirname, "../ligo/src/d-art.auction/auction_main.mligo") + " english_auction_tez_main "), (err, stdout, errout) => {
            if (err) {
                console.log(kleur.red('Failed to compile the contract.'));
                console.log(kleur.yellow().dim(err.toString()));
                console.log(kleur.red().dim(errout));
                reject();
            }
            else {
                console.log(kleur.green('Contract compiled succesfully at:'));
                // Write json contract into json file
                console.log('  ' + path.join(__dirname, '../ligo/src/d-art.auction/auction_main.tz'));
                fs.writeFileSync(path.join(__dirname, '../ligo/src/d-art.auction/auction_main.tz'), stdout);
                resolve();
            }
        }));
    });
}
exports.compileContract = compileContract;
function deployContract() {
    return __awaiter(this, void 0, void 0, function* () {
        const code = yield helper_1.loadFile(path.join(__dirname, '../ligo/src/d-art.auction/auction_main.tz'));
        const originateParam = {
            code: code,
            storage: {
                auctions: new taquito_1.MichelsonMap(),
                max_auction_time: 600,
                current_id: 0,
                preconfigured_auctions: new taquito_1.MichelsonMap(),
                extend_time: 300,
                round_time: 60,
                min_raise: 1,
                min_raise_percent: 1,
                fee: {
                    fee_percent: 10,
                    fee_address: 'tz1KhMoukVbwDXRZ7EUuDm7K9K5EmJSGewxd'
                },
                admin: {
                    admin_address: 'tz1KhMoukVbwDXRZ7EUuDm7K9K5EmJSGewxd',
                    pb_key: 'edpkvXH8BHwfDCzEJH98GGhW28aA5bXYY7bLwGVLery5RnKCV1SHAu'
                }
            }
        };
        try {
            const toolkit = new taquito_1.TezosToolkit('https://edonet.smartpy.io');
            toolkit.setProvider({ signer: yield signer_1.InMemorySigner.fromSecretKey('edskS9Gdwb6GqG3arwBHi2K5n5D8do8ygqsBvy5nTpDfJ37iLJSbAML8UymBUJGbFUzdqQ3USWFuyphSPzAmxWRqNG9q9fhfzr') });
            const originationOp = yield toolkit.contract.originate(originateParam);
            yield originationOp.confirmation();
            const { address } = yield originationOp.contract();
            console.log('Contract deployed at: ', address);
        }
        catch (error) {
            const jsonError = JSON.stringify(error);
            console.log(kleur.red(`English auction (tez) origination error ${jsonError}`));
        }
    });
}
exports.deployContract = deployContract;
function bs58Encode(payload, prefix) {
    let n = new Uint8Array(prefix.length + payload.length);
    n.set(prefix);
    n.set(payload, prefix.length);
    return bs58check.encode(Buffer.from(n)).toString('hex');
}
function bs58decode(enc, prefix) {
    let n = bs58check.decode(enc);
    n = n.slice(prefix.length);
    return n;
}
function getKeyPairFromSeed(seed) {
    return __awaiter(this, void 0, void 0, function* () {
        yield sodium.ready;
        const pair = sodium.crypto_sign_seed_keypair(sodium.crypto_generichash(32, sodium.from_string(seed)));
        const sk = bs58Encode(pair.privateKey, new Uint8Array([43, 246, 78, 7]));
        const pk = bs58Encode(pair.publicKey, new Uint8Array([13, 15, 37, 217]));
        const pkh = bs58Encode(sodium.crypto_generichash(20, pair.publicKey), new Uint8Array([6, 161, 159]));
        console.log('secretkey: ', sk);
        console.log('publickey: ', pk);
        console.log('publickeyhash: ', pkh);
        const message = Buffer.from("Signed message to the contract");
        const signature = sodium.crypto_sign_detached(sodium.crypto_generichash(32, message), pair.privateKey, 'uint8array');
        const edsignature = bs58Encode(signature, new Uint8Array([9, 245, 205, 134, 18]));
        console.log('edsignature: ', edsignature);
        console.log('message to hex: ', message.toString('hex'));
        return pair;
    });
}
exports.getKeyPairFromSeed = getKeyPairFromSeed;
//# sourceMappingURL=contract.js.map