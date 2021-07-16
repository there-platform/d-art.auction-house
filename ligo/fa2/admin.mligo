#if !SIMPLE_ADMIN
#define SIMPLE_ADMIN

type admin_storage = {
  admin_address : address;
  pb_key : key;
}

(* Fails if sender is not admin *)
let fail_if_not_admin_ext (storage, extra_msg : admin_storage * string) : unit =
  if Tezos.sender <> storage.admin_address
  then failwith ("NOT_AN_ADMIN" ^  " "  ^ extra_msg)
  else unit

(* Fails if sender is not admin *)
let fail_if_not_admin (storage : admin_storage) : unit =
  if Tezos.sender <> storage.admin_address
  then failwith "NOT_AN_ADMIN"
  else unit

(* Returns true if sender is admin *)
let is_admin (storage : admin_storage) : bool = Tezos.sender = storage.admin_address

#endif