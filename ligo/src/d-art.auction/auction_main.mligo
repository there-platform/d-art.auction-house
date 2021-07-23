#include "../../fa2/fa2_interface.mligo"
#include "admin_main.mligo"
#include "../common.mligo"

type royalties_param =
[@layout:comb] 
{
  token_id: token_id;
  fee: tez;
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

type fix_sale = 
[@layout:comb] 
{
  seller: address;
  asset: fa2_token;
  price: tez;
}

type fix_buy =
[@layout:comb] 
{
  asset: fa2_token;
}

type preconfigured_param =
  [@layout:comb]
  {
    seller: address;
    opening_price : tez;
    asset : fa2_token;
  }

type update_preconfiguration_param = 
[@layout:comb]
{
  seller: address;
  updated_opening_price : tez;
  asset : fa2_token;
}

type delete_preconfiguration_param =
[@layout:comb]
{
  seller: address;
  asset : fa2_token;
}

type configure_param =
[@layout:comb]
{
  start_time : timestamp;
  end_time : timestamp;
  asset : fa2_token;
}

type authorization_signature = {
  signed : signature;
  message : bytes;
}

type bid_and_resolve_entrypoints = 
[@layout:comb]
{
  token_info: token_info;
  authorization_signature: authorization_signature;
}

type auction_entrypoints =
  | Bid of bid_and_resolve_entrypoints
  | Resolve of bid_and_resolve_entrypoints
  | PreConfigure of preconfigured_param
  | UpdatePreConfiguration of update_preconfiguration_param
  | DeletePreConfiguration of delete_preconfiguration_param
  | Admin of admin_minter_entrypoints

type return = operation list * storage

let transfer_token_in_contract (token, from_, to_ : fa2_token * address * address) : operation =
  let destination : transfer_destination = {
      to_ = to_;
      token_id = token.token_id;
      amount = token.amount;
   } in
   
   let transfer_param = [{from_ = from_; destinations = [destination]}] in
   let contract = address_to_contract_transfer_entrypoint(token.fa2_address) in
   (Tezos.transaction transfer_param 0mutez contract) 

let token_already_in_auction (token_info, storage : token_info * storage) : bool =
  Big_map.mem token_info storage.auctions

let get_auction_data ((token_info, storage) : token_info * storage) : auction =
  match (Big_map.find_opt token_info storage.auctions) with
      None -> (failwith "Auction does not exist for given asset_id" : auction)
    | Some auction -> auction

let get_preconfigured_auction_data (token_info, storage : token_info * storage) : preconfigured_auction =
  match (Big_map.find_opt token_info storage.preconfigured_auctions) with
     None -> (failwith "Auction is not preconfigured" : preconfigured_auction)
    | Some preconfigured_auction -> preconfigured_auction

let auction_started (auction : auction) : bool =
  Tezos.now >= auction.start_time

let auction_ended (auction : auction) : bool =
  Tezos.now >= auction.end_time (* auction has passed auction time*)

let rount_time_passed (auction : auction) : bool =
  Tezos.now > auction.last_bid_time + auction.round_time (*round time has passed after bid has been placed*)

let auction_in_progress (auction : auction) : bool =
  auction_started(auction) && (not auction_ended(auction)) && rount_time_passed(auction)

let valid_bid_amount (auction : auction) : bool =
  (Tezos.amount >= (auction.current_bid + (percent_of_bid_tez (auction.min_raise_percent, auction.current_bid)))) ||
  (Tezos.amount >= auction.current_bid + auction.min_raise)

let preconfigure_auction_storage(preconfigured_param, seller, storage : preconfigured_param * address * storage ) : storage = 
  begin
    assert_msg (preconfigured_param.opening_price > 0mutez, "Opening price must be greater than 0mutez");
    assert_msg (Tezos.amount = 0mutez, "Amount sent must be 0mutez");
    assert_msg (storage.round_time > 0n, "Round_time must be greater than 0 seconds");

    let preconfigured_auction_data : preconfigured_auction = {
      seller = seller;
      opening_price = preconfigured_param.opening_price;
      round_time = int(storage.round_time);
      extend_time = int(storage.extend_time);
      asset = preconfigured_param.asset;
      min_raise_percent = storage.min_raise_percent;
      min_raise = storage.min_raise;
    } in

    let token_info = {
      token_address = preconfigured_auction_data.asset.fa2_address;
      token_id = preconfigured_auction_data.asset.token_id
    } in

    let updated_preconfigured_auctions : (token_info, preconfigured_auction) big_map = Big_map.update token_info (Some preconfigured_auction_data) storage.preconfigured_auctions in
    { storage with preconfigured_auctions = updated_preconfigured_auctions;  }
  end

let configure_preconfigured_auction (token_info, preconfigured_auction, storage : token_info * preconfigured_auction * storage) : (operation list) * storage = 
  begin
    let auction_data : auction = {
      seller = preconfigured_auction.seller;
      current_bid = Tezos.amount;
      start_time = Tezos.now;
      round_time = preconfigured_auction.round_time;
      extend_time = preconfigured_auction.extend_time;
      asset = preconfigured_auction.asset;
      min_raise_percent = preconfigured_auction.min_raise_percent;
      min_raise = preconfigured_auction.min_raise;
      end_time = Tezos.now + 240;
      highest_bidder = Tezos.sender;
      last_bid_time = Tezos.now; 
    } in

    if (Tezos.amount <= preconfigured_auction.opening_price) 
      then failwith "Invalid bid amount" 
    else 
      assert_msg (Tezos.sender = Tezos.source, "Bidder must be an implicit account");
      assert_msg (Tezos.sender <> auction_data.seller, "Seller cannot place a bid");
      
      let updated_auctions : (token_info, auction) big_map = Big_map.update token_info (Some auction_data) storage.auctions in
      let updated_preconfigured_auctions : (token_info, preconfigured_auction) big_map = Big_map.remove token_info storage.preconfigured_auctions in
      (([] : operation list), { storage with auctions = updated_auctions; preconfigured_auctions = updated_preconfigured_auctions })
  end

let preconfigure_auction(preconfigured_param, storage : preconfigured_param * storage) : return =
  let _u : unit = assert_msg (storage.fee.fee_percent <= 100n, "Fee_percent must be less than 100%. Please originate another contract.") in
  let _e : unit = assert_msg (Tezos.sender = preconfigured_param.seller, "Only seller can preconfigure auction") in
  let _a : unit = assert_msg (preconfigured_param.asset.amount > 0n, "Please provide an amount > 0") in

  let new_storage = preconfigure_auction_storage(preconfigured_param, Tezos.sender, storage) in
  let fa2_transfer : operation = transfer_token_in_contract(preconfigured_param.asset, Tezos.sender, Tezos.self_address) in
  ([fa2_transfer], new_storage)

let update_preconfigured_auction(update_preconfiguration_param, storage : update_preconfiguration_param * storage) : return =
  let _e : unit = assert_msg (Tezos.sender = update_preconfiguration_param.seller, "Only seller can update a preconfigured auction") in
  let _p : unit = assert_msg (update_preconfiguration_param.updated_opening_price > 0mutez, "Opening price must be greater than 0mutez") in

  let token_info : token_info = {
    token_address = update_preconfiguration_param.asset.fa2_address;
    token_id = update_preconfiguration_param.asset.token_id;
  } in

  let old_preconfigured_auction : preconfigured_auction = get_preconfigured_auction_data(token_info, storage) in

  let new_preconfigured_auction : preconfigured_auction = {
      seller = old_preconfigured_auction.seller;
      opening_price = update_preconfiguration_param.updated_opening_price;
      round_time = old_preconfigured_auction.round_time;
      extend_time = old_preconfigured_auction.extend_time;
      asset = old_preconfigured_auction.asset;
      min_raise_percent = old_preconfigured_auction.min_raise_percent;
      min_raise = old_preconfigured_auction.min_raise;
  } in

  let updated_preconfigured_auctions : (token_info, preconfigured_auction) big_map = Big_map.update token_info (Some new_preconfigured_auction) storage.preconfigured_auctions in

  let new_storage = { storage with preconfigured_auctions = updated_preconfigured_auctions } in
  ([] : operation list), new_storage

let delete_preconfigured_auction (delete_preconfiguration_param, storage : delete_preconfiguration_param * storage) : return = 
  let _e : unit = assert_msg (Tezos.sender = delete_preconfiguration_param.seller, "Only seller can delete a preconfigured auction") in
  let _e : unit = assert_msg (Tezos.amount = 0mutez, "Amount must be 0mutez") in

  let token_info : token_info = {
    token_address = delete_preconfiguration_param.asset.fa2_address;
    token_id = delete_preconfiguration_param.asset.token_id;
  } in


  let to_delete_preconfigured_auction : preconfigured_auction = get_preconfigured_auction_data(token_info, storage) in
  let fa2_transfer : operation list = [transfer_token_in_contract(to_delete_preconfigured_auction.asset, Tezos.self_address, to_delete_preconfigured_auction.seller)] in

  let updated_preconfigured_auctions : (token_info, preconfigured_auction) big_map = Big_map.remove token_info storage.preconfigured_auctions in

  let new_storage = { storage with preconfigured_auctions = updated_preconfigured_auctions } in
  fa2_transfer, new_storage


let place_bid_on_existing_auction (token_info, storage: token_info * storage) : (operation list * storage) = begin
    let auction : auction = get_auction_data(token_info, storage) in
    assert_msg (auction_in_progress(auction), "Auction must be in progress");
    assert_msg(Tezos.sender <> auction.seller, "Seller cannot place a bid");

    (if not valid_bid_amount(auction) 
      then ([%Michelson ({| { FAILWITH } |} : string * (tez * tez * address * timestamp * timestamp) -> unit)] ("Invalid Bid amount", (auction.current_bid, Tezos.amount, auction.highest_bidder, auction.last_bid_time, Tezos.now)) : unit)
      else ());
    
    let highest_bidder_contract : unit contract = resolve_contract(auction.highest_bidder) in
    let return_bid : operation = Tezos.transaction unit auction.current_bid highest_bidder_contract in
    let new_end_time = if auction.end_time - Tezos.now <= auction.extend_time then
    Tezos.now + auction.extend_time else auction.end_time in

    let updated_auction_data = {auction with current_bid = Tezos.amount; highest_bidder = Tezos.sender; last_bid_time = Tezos.now; end_time = new_end_time; } in
    let updated_auctions = Big_map.update token_info (Some updated_auction_data) storage.auctions in
    ([return_bid] , {storage with auctions = updated_auctions})  
  end

let place_bid(bid_and_resolve_entrypoints, storage : bid_and_resolve_entrypoints * storage) : (operation list) * storage = 
  let _e : bool = verify_user(bid_and_resolve_entrypoints.authorization_signature.signed, bid_and_resolve_entrypoints.authorization_signature.message, storage) in

  if token_already_in_auction(bid_and_resolve_entrypoints.token_info, storage) 
    then place_bid_on_existing_auction(bid_and_resolve_entrypoints.token_info, storage)
  else
    let preconfigured_auction : preconfigured_auction = get_preconfigured_auction_data(bid_and_resolve_entrypoints.token_info, storage) in
    configure_preconfigured_auction(bid_and_resolve_entrypoints.token_info, preconfigured_auction, storage)

let resolve_auction(bid_and_resolve_entrypoints, storage : bid_and_resolve_entrypoints * storage) : return = begin
    
    let _e : bool = verify_user(bid_and_resolve_entrypoints.authorization_signature.signed, bid_and_resolve_entrypoints.authorization_signature.message, storage) in

    let auction : auction = get_auction_data(bid_and_resolve_entrypoints.token_info, storage) in
    assert_msg (auction_ended(auction) , "Auction must have ended");
    assert_msg (Tezos.amount = 0mutez, "Amount must be 0mutez");
    assert_msg (Tezos.sender = auction.highest_bidder, "Sender must be highest bidder");

    let fa2_transfer : operation list = [transfer_token_in_contract(auction.asset, Tezos.self_address, auction.highest_bidder)] in
    let seller_contract : unit contract = resolve_contract(auction.seller) in
    
    let fee_contract : unit contract = resolve_contract(storage.fee.fee_address) in
    let fa2_contract : royalties_param contract = minter_to_contract_ownership_entrypoint(bid_and_resolve_entrypoints.token_info.token_address) in
    
    let minter_fee : tez = percent_of_bid_tez (abs(10), auction.current_bid) in
    
    let royalties_param : royalties_param = {
      token_id = bid_and_resolve_entrypoints.token_info.token_id;
      fee = minter_fee;
    } in 

    let pay_roylaties : operation = Tezos.transaction royalties_param minter_fee fa2_contract in

    let fee : tez = percent_of_bid_tez (storage.fee.fee_percent, auction.current_bid) in 
    let pay_fee : operation = Tezos.transaction unit fee fee_contract in 
    
    let send_final_bid_minus_fee : operation = Tezos.transaction unit (auction.current_bid - fee - minter_fee) seller_contract in

    let op_list : operation list = (pay_roylaties :: pay_fee :: send_final_bid_minus_fee :: fa2_transfer ) in

    let updated_auctions = Big_map.remove bid_and_resolve_entrypoints.token_info storage.auctions in
    (op_list, {storage with auctions = updated_auctions})
  end

let english_auction_tez_main (p , storage : auction_entrypoints * storage) : (operation list) * storage = match p with
    | PreConfigure preconfig -> preconfigure_auction(preconfig, storage)
    | UpdatePreConfiguration update_preconfig -> update_preconfigured_auction(update_preconfig, storage)
    | DeletePreConfiguration delete_preconfig -> delete_preconfigured_auction(delete_preconfig, storage)

    | Bid bid_and_resolve_entrypoints -> place_bid(bid_and_resolve_entrypoints, storage)
    | Resolve bid_and_resolve_entrypoints -> resolve_auction(bid_and_resolve_entrypoints, storage)

    | Admin admin_param -> admin_main (admin_param, storage)
