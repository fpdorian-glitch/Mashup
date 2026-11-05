import test from 'node:test';
import assert from 'node:assert/strict';
import {createPendingPackStorage,shouldConfirmRevealedPack} from '../../62-pack-recovery.js';

function storage() {
  const map=new Map();
  return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
}
const father='35a2e0a0-5651-40bc-8e9d-4aa551b01111';
const friend='c6e95263-a960-4389-916a-a8be9bb02222';
const opening='61c65a3a-2cd3-44be-a79a-83f139123333';
test('une ouverture préparée survit à une nouvelle session',()=>{
  const local=storage();
  assert.equal(createPendingPackStorage(local).remember(father,'premium',opening),true);
  assert.deepEqual(createPendingPackStorage(local).read(father),{userId:father,packId:'premium',openingId:opening});
});
test('aucun joueur ne récupère le tirage de son voisin',()=>{
  const store=createPendingPackStorage(storage());
  store.remember(father,'premium',opening);
  assert.equal(store.read(friend),null);
  assert.equal(store.forget(friend,opening),false);
  assert.ok(store.read(father));
});
test('un reçu différent ne peut pas effacer un tirage',()=>{
  const store=createPendingPackStorage(storage());store.remember(father,'premium',opening);
  assert.equal(store.forget(father,'c6e95263-a960-4389-916a-a8be9bb02222'),false);
  assert.ok(store.read(father));
  assert.equal(store.forget(father,opening),true);
  assert.equal(store.read(father),null);
});
test('les identifiants et stockages corrompus sont rejetés',()=>{
  const store=createPendingPackStorage(storage());
  assert.equal(store.remember(father,'premium',''),false);
  assert.equal(store.remember(father,'premium','<script>'),false);
  assert.equal(store.remember('','premium',opening),false);
  assert.equal(createPendingPackStorage(null).read(father),null);
});
test('confirmation uniquement après la dernière carte rangée',()=>{
  const state={revealed:5,total:5,pendingId:opening};
  assert.equal(shouldConfirmRevealedPack(state),true);
  assert.equal(shouldConfirmRevealedPack({...state,revealed:4}),false);
  for(const flag of ['busy','loading','finalizing'])assert.equal(shouldConfirmRevealedPack({...state,[flag]:true}),false);
  assert.equal(shouldConfirmRevealedPack({...state,pendingId:null}),false);
  assert.equal(shouldConfirmRevealedPack({...state,total:0,revealed:0}),false);
});
