import * as fs from 'fs';
import * as kleur from 'kleur';
import * as path from 'path';
import * as child from 'child_process';

import { loadFile } from './helper';
import { InMemorySigner } from '@taquito/signer';
import { MichelsonMap, TezosToolkit } from '@taquito/taquito';
import * as bs58check from 'bs58check';
const sodium = require('libsodium-wrappers');

export async function compileContract(): Promise<void> {
    await new Promise<void>((resolve, reject) =>
        // Compile the contract
        child.exec(
            path.join(__dirname, "../ligo/exec_ligo compile-contract " + path.join(__dirname,  "../ligo/src/d-art.auction/auction_main.mligo") + " english_auction_tez_main "),
            (err, stdout, errout) => {
                if (err) {
                    console.log(kleur.red('Failed to compile the contract.'));
                    console.log(kleur.yellow().dim(err.toString()))
                    console.log(kleur.red().dim(errout));
                    reject();
                } else {
                    console.log(kleur.green('Contract compiled succesfully at:'))
                    // Write json contract into json file
                    console.log('  ' + path.join(__dirname, '../ligo/src/d-art.auction/auction_main.tz'))
                    fs.writeFileSync(path.join(__dirname, '../ligo/src/d-art.auction/auction_main.tz'), stdout)
                    resolve();
                }
            }    
        )
    );
}

export async function deployContract(): Promise<void> {
    const code = await loadFile(path.join(__dirname, '../ligo/src/d-art.auction/auction_main.tz'))

    const  originateParam = {
        code: code,
        storage: {
            auctions: new MichelsonMap(),
            max_auction_time: 600,
            current_id: 0,
            preconfigured_auctions: new MichelsonMap(),
            extend_time: 300,
            round_time: 60,
            min_raise: 1,
            min_raise_percent: 1,
            fee: {
                fee_percent: 5,
                fee_address: 'tz1KhMoukVbwDXRZ7EUuDm7K9K5EmJSGewxd'
            },
            admin : {
                admin_address : 'tz1KhMoukVbwDXRZ7EUuDm7K9K5EmJSGewxd',
                pb_key : 'edpkvXH8BHwfDCzEJH98GGhW28aA5bXYY7bLwGVLery5RnKCV1SHAu'
            }
        }
    }
    
    try {
        const toolkit = new TezosToolkit('http://florence.newby.org:8732');
        toolkit.setProvider({ signer: await InMemorySigner.fromSecretKey(process.env.PRIVATE_KEY) });

        const originationOp = await toolkit.contract.originate(originateParam);
        
        await originationOp.confirmation();
        const { address } = await originationOp.contract() 
        
        console.log('Contract deployed at: ', address)

    } catch (error) {
        const jsonError = JSON.stringify(error);
        console.log(kleur.red(`English auction (tez) origination error ${jsonError}`));
    }
}

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

export async function getKeyPairFromSeed(seed: string): Promise<any> {
    await sodium.ready

    const pair = sodium.crypto_sign_seed_keypair(sodium.crypto_generichash(32, sodium.from_string(seed)))

    const sk = bs58Encode(pair.privateKey, new Uint8Array([43, 246, 78, 7]))
    const pk = bs58Encode(pair.publicKey, new Uint8Array([13, 15, 37, 217]))
    const pkh = bs58Encode(sodium.crypto_generichash(20, pair.publicKey), new Uint8Array([6, 161, 159]))

    console.log('secretkey: ', sk)
    console.log('publickey: ', pk)
    console.log('publickeyhash: ', pkh)
    
    const message = Buffer.from("Signed message to the contract")
    
    const signature = sodium.crypto_sign_detached(sodium.crypto_generichash(32, message), pair.privateKey, 'uint8array')
    const edsignature = bs58Encode(signature, new Uint8Array([9, 245, 205, 134, 18]))
    
    console.log('edsignature: ', edsignature)

    console.log('message to hex: ', message.toString('hex'))

    return pair
}

