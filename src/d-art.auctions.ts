#!/usr/bin/env node

const program = require('commander');
import * as ver from './ver';
import * as contract from './contract';
import * as bootstrap from './bootstrap';

program
    .command('compile-contract')
    .action(contract.compileContract)

program
    .command('deploy-contract')
    .action(contract.deployContract)

program
    .command('generate-key-pair')
    .requiredOption('-s, --seed <seed>', 'seed input')
    .action((options) => contract.getKeyPairFromSeed(options.seed))

program
    .option('-v', 'show version', ver, '')
    .action(ver.showVersion);

program.parse(process.argv)