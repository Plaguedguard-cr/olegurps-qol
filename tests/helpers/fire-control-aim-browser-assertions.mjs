// Shared by Node geometry fixtures and the real ApplicationV2 browser check.
export function verifyFireControlAimLayout(root, {expectedWidth, expectedColumns} = {}) {
  const checks = [];
  const check = (name, ok) => {if (!ok) throw Error(name); checks.push(name);};
  const box = element => {
    const r = element.getBoundingClientRect();
    return Object.fromEntries(['left','top','right','bottom','width','height'].map(k=>[k,r[k]]));
  };
  const overlaps = (a,b) => Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 &&
    Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
  const near = (a,b) => Math.abs(a-b)<=1;
  const fields = root.querySelector('.gam-fire-fields');
  check('fields exist',!!fields);
  const shots = fields.querySelector('[name="shots"]')?.closest('.gam-fire-field');
  const modifier = fields.querySelector('[name="manualModifier"]')?.closest('.gam-fire-field');
  const laser = fields.querySelector('[name="laserSight"]')?.closest('.gam-fire-field');
  const aim = fields.querySelector('.gam-fire-aim');
  check('all four fields exist',!!shots&&!!modifier&&!!laser&&!!aim);
  check('original field order',fields.children[0]===shots&&fields.children[1]===modifier&&
    fields.children[2]===laser&&fields.children[3]===aim);
  const view = root.ownerDocument?.defaultView ?? globalThis;
  const columns = view.getComputedStyle(fields).gridTemplateColumns.trim().split(/\s+/).length;
  const geometry = {window:box(root),fields:box(fields),shots:box(shots),modifier:box(modifier),laser:box(laser),aim:box(aim)};
  if (expectedWidth!==undefined) check('requested window width',near(geometry.window.width,expectedWidth));
  if (expectedColumns!==undefined) check('responsive column count',columns===expectedColumns);
  check('shots stay first',near(geometry.shots.left,geometry.fields.left)&&near(geometry.shots.top,geometry.fields.top));
  if (columns===2) {
    check('modifier stays first row right',near(geometry.modifier.top,geometry.shots.top)&&geometry.modifier.left>geometry.shots.right);
    check('laser stays second row left',near(geometry.laser.left,geometry.shots.left)&&geometry.laser.top>geometry.shots.bottom);
    check('Aim second row opposite laser',near(geometry.aim.top,geometry.laser.top)&&near(geometry.aim.left,geometry.modifier.left));
    check('Aim occupies one column',near(geometry.aim.width,geometry.modifier.width));
  } else {
    check('single column on narrow window',columns===1);
    check('narrow fields wrap in order',geometry.modifier.top>=geometry.shots.bottom&&geometry.laser.top>=geometry.modifier.bottom&&geometry.aim.top>=geometry.laser.bottom);
  }
  const rects = [geometry.shots,geometry.modifier,geometry.laser,geometry.aim];
  for (let i=0;i<rects.length;i++) for (let j=i+1;j<rects.length;j++) check(`fields ${i}/${j} do not overlap`,!overlaps(rects[i],rects[j]));
  check('Aim keeps label, input and result',aim.children.length===4);
  const parts = Array.from(aim.children,box);
  for (let i=0;i<parts.length;i++) {
    const part = parts[i],parent = geometry.aim;
    check(`Aim part ${i} inside field`,part.left>=parent.left-1&&part.top>=parent.top-1&&part.right<=parent.right+1&&part.bottom<=parent.bottom+1);
    for (let j=i+1;j<parts.length;j++) check(`Aim parts ${i}/${j} do not overlap`,!overlaps(part,parts[j]));
  }
  for (const element of [root,root.querySelector('.window-content'),fields,aim].filter(Boolean))
    check('no horizontal overflow',element.scrollWidth<=element.clientWidth+1);
  return {columns,geometry,checks};
}
