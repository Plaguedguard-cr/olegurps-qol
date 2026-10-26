import test from 'node:test';
import assert from 'node:assert/strict';
import {installMeleeNativeDamage,numericMeleeDamageEvent} from '../scripts/tools/melee-native-damage.js';

test('only marked numeric melee bypasses GGA !/divisor reordering and second dice conversion',async()=>{
  const calls=[];
  class DamageChat{
    _getDiceData(formula,type,mods,override,ext){calls.push({formula,type,mods,override,ext});return {formula};}
    static async create(actor,dice,type,event,override,targets,ext){
      // Simulate GGA addBucketToDamage changing the submitted numeric expression.
      return new DamageChat()._getDiceData('3d! (2)',type,[],override,ext);
    }
  }
  const original=DamageChat.create,originalDice=DamageChat.prototype._getDiceData;
  const runtime={GURPS:{DamageChat,ModifierBucket:{currentSum:()=>2}},game:{settings:{get:()=>({autoAdd:true})}}};
  const installed=installMeleeNativeDamage(runtime);
  assert.equal(installMeleeNativeDamage(runtime),installed);
  await DamageChat.create({},'2d+4(2)!','cut',numericMeleeDamageEvent(null,{formula:'2d+4(2)!'}),null,[],'ex');
  assert.deepEqual(calls.pop(),{formula:'2d+4(2)!',type:'cut',mods:[{modint:2,desc:''}],override:null,ext:'ex'});
  await DamageChat.create({},'2d+4(2)!','cut',{},null,[],'ex');
  assert.equal(calls.pop().formula,'3d! (2)');
  installed.uninstall();assert.equal(DamageChat.create,original);assert.equal(DamageChat.prototype._getDiceData,originalDice);
});
test('manual modifiers are forwarded once when GGA autoAdd is off, markers are per event',async()=>{
  const calls=[];
  class DamageChat{
    _getDiceData(formula,type,mods){calls.push({formula,mods});}
    static async create(actor,dice,type,event,override){await Promise.resolve();return new DamageChat()._getDiceData(dice,type,[{modint:-1}],override);}
  }
  const runtime={GURPS:{DamageChat,ModifierBucket:{currentSum:()=>-1}},game:{settings:{get:()=>({autoAdd:false})}}};
  const installed=installMeleeNativeDamage(runtime);
  await Promise.all(['1d+5(2)!','4d+1'].map(formula=>DamageChat.create({},formula,'cut',numericMeleeDamageEvent(null,{formula}),null)));
  assert.deepEqual(calls,[{formula:'1d+5(2)!',mods:[{modint:-1}]},{formula:'4d+1',mods:[{modint:-1}]}]);installed.uninstall();
});
