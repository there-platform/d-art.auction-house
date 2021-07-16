
import * as fs from 'fs';
import * as kleur from 'kleur';
import * as path from 'path';
import { InMemorySigner } from '@taquito/signer';
import { TezosToolkit } from '@taquito/taquito';


export async function activateAccounts(): Promise<void> {
    try {
        for (let owner of ['owner', 'bob', 'alice']) {
            const faucet = JSON.parse(fs.readFileSync(path.join(__dirname, `../ligo/faucets/${owner}_faucet.json`)).toString())

            const signer = await InMemorySigner.fromFundraiser(
                faucet.email,
                faucet.password,
                faucet.mnemonic.join(' ')
            );

            await activateFaucet(signer, faucet.secret);
        }
    } catch(error) {
        console.log(kleur.red(error))
        console.log(kleur.yellow('No owner found for the specified name, try : owner, bob, or alice'))
    }
}

async function activateFaucet(signer: InMemorySigner, secret: string): Promise<void> {
    const address = await signer.publicKeyHash();
    const toolkit = createToolkit(signer)
    const bal = await toolkit.tz.getBalance(address);

    if (bal.eq(0)) {
        console.log(kleur.yellow('Activating faucet account...'));
        const op = await toolkit.tz.activate(address, secret);
        await op.confirmation();
        console.log(kleur.green('Faucet account activated'));
      }
    else {
        console.log(kleur.yellow('Accounts already activated.'))
    }
}

export function createToolkit(signer: InMemorySigner) : TezosToolkit {
    const toolkit = new TezosToolkit('https://florencenet.smartpy.io');
    
    toolkit.setProvider({
        signer: signer,
        config: { confirmationPollingIntervalSecond: 5 }
    })

    return toolkit
}

