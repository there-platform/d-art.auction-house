#include "../../fa2/admin.mligo"

type admin_minter_entrypoints =
    | Update_pb_key of key

let admin_main (param, storage : admin_minter_entrypoints * storage)
    : (operation list) * storage =
  match param with

  | Update_pb_key key -> 
    let fail = fail_if_not_admin (storage.admin) in
    let new_admin_storage : admin_storage = {
      admin_address = storage.admin.admin_address;
      pb_key = key;
    } in
    let new_storage = { storage with admin = new_admin_storage } in
    ([] : operation list), new_storage