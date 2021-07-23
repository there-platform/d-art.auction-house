# d-art.auction-house

## Introduction:

    Auction house contract, in order to perform english auction contract.

## Install the CLI (TypeScript):

To install all the dependencies of the project please run:
    
    $ cd /d-art.auction-house 
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

# English Auction

## Storage definition

This section is responsible to list and explain the storage of the contract.

``` ocaml
type storage =
[@layout:comb]
{
  max_auction_time : nat;
  extend_time: nat;
  round_time: nat;
  min_raise: tez;
  min_raise_percent: nat;
  auctions : (token_info, auction) big_map;
  preconfigured_auctions : (token_info, preconfigured_auction) big_map;
  fee : fee_data;
  admin : admin_storage;
}
```

`max_auction_time`: The time an auction is going to be active for after the first bid

`extend_time`: The amount by which to extend the auction from NOW if bid placed at NOW is within extend_time from end_time.

`round_time`: In seconds, the amount of time from when the last bid was placed for a bidder to place a new bid.

`min_raise`: The amount increase of previous bid in tez used to determine the minimum valid subsequent bid.

`min_raise_precent`: Percentage increase of the previous bid used to determine the minimum valid subsequent bid.

### auctions

``` ocaml
type storage =
[@layout:comb]
{
  ...
  auctions : (token_info, auction) big_map;
  ...
}

type auction =
[@layout:comb]
{
    seller : address;
    current_bid : tez;
    start_time : timestamp;
    last_bid_time : timestamp;
    round_time : int;
    extend_time : int;
    asset : fa2_token;
    min_raise_percent : nat;
    min_raise : tez;
    end_time : timestamp;
    highest_bidder : address;
}

```

These are all the parameters to configure an auction, before a first person bid auctions are not registeres in this big_map but in the `preconfigured_auctions` one where they can be edited or deleted by the seller.

### preconfigured_auctions

``` ocaml
type storage =
[@layout:comb]
{
  ...
  preconfigured_auctions : (token_info, preconfigured_auction) big_map;
  ...
}

type preconfigured_auction = 
[@layout:comb]
{
  seller: address;
  opening_price : tez;
  round_time : int;
  extend_time : int;
  asset : fa2_token;
  min_raise_percent : nat;
  min_raise : tez;
}

```

### fee

``` ocaml
type fee_data = 
[@layout:comb]
{
  fee_address : address;
  fee_percent : nat;
}
```

Type in order to call the minter_royalties function from the minter contract in order to transfer royalties to the minter.

### admin


``` ocaml
type admin_storage = {
  admin_address : address;
  pb_key : key;
}
```

`admin_address`: The tezos address of the admin

`pb_key`: public_key that protect the bid and resolve entrypoint


## Entrypoints

The different entrypoitns of the contract are defined by:

``` ocaml

type auction_entrypoints =
  | Bid of bid_and_resolve_entrypoints
  | Resolve of bid_and_resolve_entrypoints
  | PreConfigure of preconfigured_param
  | UpdatePreConfiguration of update_preconfiguration_param
  | DeletePreConfiguration of delete_preconfiguration_param
  | Admin of admin_minter_entrypoints

```

### Admin

The `Admin` entrypoint is only responsible to change the `pb_key` responsible to check the message and it's signature.

The entrypoints protected are:

```
- Bid
- Resolve
```

#### admin_minter_entrypoints

``` ocaml
type admin_minter_entrypoints =
    | Update_pb_key of key
```

##### Update_pb_key

Entrypoint to update public key for the signature verification.

### Bid

The `bid` entrypoint is responsible to place a bid on a preconfigured auction or an auction.

``` ocaml
type bid_and_resolve_entrypoints = 
[@layout:comb]
{
  token_info: token_info;
  authorization_signature: authorization_signature;
}

type authorization_signature = {
  signed : signature;
  message : bytes;
}
```

### Resolve

The `resolve` entrypoint is responsible to resolve an auction, (only the buyer can resolve an auction - an update is soon coming where the seller is as well authorized)

``` ocaml
type bid_and_resolve_entrypoints = 
[@layout:comb]
{
  token_info: token_info;
  authorization_signature: authorization_signature;
}

type authorization_signature = {
  signed : signature;
  message : bytes;
}
```

### Preconfigure

The `preconfigure` entrypoint is responsible to preconfigure an auction 

``` ocaml
type preconfigured_param =
  [@layout:comb]
  {
    seller: address;
    opening_price : tez;
    asset : fa2_token;
  }
```

All the needed field to configure an auction. Soon will come an allow listed version and a registered version, similar as the `fixed price sale` contract.

### UpdatePreConfiguration

The `UpdatePreConfiguration` entrypoint is responsible to update a preconfigured auction, note that as soon as buyer bid it the preconfigured auction move to the auction big_map where updates, and deletion are not possible anymore.

``` ocaml

type update_preconfiguration_param = 
[@layout:comb]
{
  seller: address;
  updated_opening_price : tez;
  asset : fa2_token;
}

```

### DeletePreConfiguration

The `DeletePreConfiguration` entrypoint is responsible to delete a preconfigured auction, note that as soon as buyer bid it the preconfigured auction move to the auction big_map where updates, and deletion are not possible anymore.

``` ocaml

type delete_preconfiguration_param =
[@layout:comb]
{
  seller: address;
  asset : fa2_token;
}
```
