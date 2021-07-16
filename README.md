# d-art.contracts

## Introduction:

    Creation of a smart contract in order to deposit and withdraw tezos from a liquidity pool.

## Install the CLI (TypeScript):

    To install all the dependencies of the project please run:
        
        $ cd /d-art.contracts 
        $ npm install
        $ npm run-script build
        $ npm install -g
        
    In order to run the tests:

        $ npm run-script test
            
    The different available commands are:

        $ d-art.contracts compile-contract
            (Compile the contract contained in the project)

        $ d-art.contracts deploy-contract
            (Deploy the contract previously compiled in the project)

        $ d-art.contracts activate-accounts
            (Activate accounts in the carthagenet network)

        $ d-art.contracts deposit --amount 2 --owner bob
            (Create a deposit of a specific amount for a specific account)

        $ d-art.contracts withdraw --owner bob
            (Withdraw the money from the liquidity pool for a specific owner)

        $ d-art.contracts get-contract-balance
            (Get the balance of the previously deployed contract)

        $ d-art.contracts get-wallet-balance --owner bob
            (Get the balance of the specified wallet)

        $ d-art.contracts -v
            (Get the current version of the project)