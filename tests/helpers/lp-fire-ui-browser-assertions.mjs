// The same contract runs against actual Foundry DOM and focused geometry fixtures.
export function verifyLPFireControlLayout(root) {
  const box=e=>e.getBoundingClientRect();
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  const controls=root.querySelector('.gam-fire-lp-controls');
  const modifier=root.querySelector('[data-total-modifier]')?.closest('.gam-fire-rof-row');
  const distance=root.querySelector('.gam-fire-range-heading');
  const label=controls?.querySelector('label > span'),select=controls?.querySelector('[name="lpFireMode"]');
  check(controls&&modifier&&distance&&label&&select,'LP controls and neighboring blocks exist');
  const geometry={modifier:box(modifier),controls:box(controls),label:box(label),select:box(select),distance:box(distance)};
  check(geometry.controls.top>=geometry.modifier.bottom-1,'LP follows modifiers');
  check(geometry.controls.bottom<=geometry.distance.top+1,'LP precedes distance');
  check(geometry.select.width<geometry.controls.width-20,'LP selector stays compact');
  check(geometry.select.width>=130,'LP option text has enough space');
  for(const key of ['label','select']){
    const b=geometry[key],p=geometry.controls;
    check(b.left>=p.left-1&&b.right<=p.right+1&&b.top>=p.top-1&&b.bottom<=p.bottom+1,'LP '+key+' stays inside controls');
  }
  const a=geometry.label,b=geometry.select;
  check(Math.min(a.right,b.right)-Math.max(a.left,b.left)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<=1,'LP label and selector do not overlap');
  if(geometry.controls.width>=240)check(b.left>=a.right&&Math.abs(a.top-b.top)<12,'LP selector is horizontal');
  for(const e of [root,root.querySelector('.window-content'),controls,select].filter(Boolean))
    check(e.scrollWidth<=e.clientWidth+1,'No horizontal overflow');
  return Object.fromEntries(Object.entries(geometry).map(([k,b])=>[k,Object.fromEntries(['left','top','right','bottom','width','height'].map(v=>[v,b[v]]))]));
}
