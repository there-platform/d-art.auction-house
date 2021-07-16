#!/usr/bin/env node
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
const program = require('commander');
const ver = __importStar(require("./ver"));
const contract = __importStar(require("./contract"));
const bootstrap = __importStar(require("./bootstrap"));
program
    .command('compile-contract')
    .action(contract.compileContract);
program
    .command('deploy-contract')
    .action(contract.deployContract);
program
    .command('activate-accounts')
    .action(bootstrap.activateAccounts);
program
    .command('deposit')
    .description('make a deposit of a specific amount to the liquidity pool for the specified owner')
    .requiredOption('-a, --amount <amount>', 'amount of the deposit')
    .requiredOption('-o, --owner <owner>', 'owner of the wallet to perform the deposit')
    .action((options) => __awaiter(void 0, void 0, void 0, function* () { return contract.deposit(options.amount, options.owner); })).passCommandToAction(false);
program
    .command('withdraw')
    .requiredOption('-o, --owner <owner>', 'owner of the wallet to perform the withdrawal')
    .action((options) => __awaiter(void 0, void 0, void 0, function* () { return contract.withdraw(options.owner); }));
program
    .command('get-contract-balance')
    .action(contract.printContractBalance);
program
    .command('get-wallet-balance')
    .requiredOption('-o, --owner <owner>', 'owner of the wallet')
    .action((options) => __awaiter(void 0, void 0, void 0, function* () { return contract.printWalletBalance(options.owner); }));
program
    .option('-v', 'show version', ver, '')
    .action(ver.showVersion);
program.parse(process.argv);
//# sourceMappingURL=tezos-assignment.js.map