import assert from 'node:assert/strict';
// Keep historical audit contracts immutable. Prove the exact authorized delta
// before comparing the remaining source statuses with the original digest.
const changes=new Map([
  ...['WdUnAFzFvv59Smhhk','WgqAB3QGTUZrgtdES','WSv_Zh3pW3Tl-tCf5','WPa4KUGJ6449MaPL9'].map(id=>[id+':swarm','incompatible']),
  ['WTVT6tvGqOqE1N6e6:drugged_dart','conditional'],
  ...['homing','homing_ir','homing_multispectral_passive','homing_multispectral_antiradiation','homing_multispectral_active','homing_multiscanner']
    .map(id=>['WPP4GGv21sVx2-CHg:'+id,'incompatible'])
]);
export function beforeUT16SourceRows(rows){
  const seen=new Set();
  const previous=rows.map(row=>{
    const key=row.configurationId+':'+row.candidateId;
    if(!changes.has(key))return row;
    assert.equal(row.status,changes.get(key),key);assert.ok(!seen.has(key),key);seen.add(key);
    return {...row,status:'undetermined'};
  });
  assert.equal(seen.size,11);return previous;
}
