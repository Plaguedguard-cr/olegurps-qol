// Runs against the rendered Foundry window; geometry is never inferred from CSS text.
export function verifyElectrolaserFireControl(root,{electrolaser=true}={}){
  const view=root.ownerDocument.defaultView,style=e=>view.getComputedStyle(e),rect=e=>e.getBoundingClientRect();
  const check=(value,message)=>{if(!value)throw Error(message);};
  const body=root.querySelector('.gam-fire-preparation'),range=root.querySelector('.gam-fire-range-list'),footer=root.querySelector('.gam-fire-actions');
  check(body&&range&&footer,'Fire Control body, ranges and footer exist');
  const rs=style(range),rows=[...range.querySelectorAll('[data-range-index]')],last=rows.at(-1);
  check(parseFloat(rs.maxHeight)>0&&rs.overflowY==='auto','Range list has its restored scrollbar');
  check(range.scrollHeight>range.clientHeight,'Range list retains all rows inside its scroll area');
  check(rect(last).bottom-rect(range).top+range.scrollTop<=range.scrollHeight+1,'Last range row belongs to the scrollable list');
  check(['auto','scroll'].includes(style(body).overflowY),'Main body owns vertical scrolling');
  const fr=rect(footer),rr=rect(root);
  check(fr.top>=Math.max(rr.top,0)&&fr.bottom<=Math.min(rr.bottom,view.innerHeight)+1,'Footer stays inside the visible window');
  for(const element of [root,root.querySelector('.window-content'),body,range,root.querySelector('.gam-fire-layout')].filter(Boolean))
    check(element.scrollWidth<=element.clientWidth+1,'No horizontal overflow: '+element.className);
  const report={width:Math.round(rr.width),height:Math.round(rr.height),rangeRows:rows.length,rangeHeight:Math.round(rect(range).height),footerVisible:true};
  if(electrolaser){
    const controls=root.querySelector('[data-electrolaser-controls]'),fields=controls?.querySelector('.gam-fire-electrolaser-fields');
    check(fields,'Electrolaser controls exist');const labels=[...fields.querySelectorAll('label')],boxes=labels.map(rect);
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
      const a=boxes[i],b=boxes[j];check(Math.min(a.right,b.right)-Math.max(a.left,b.left)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<=1,'Electrolaser fields do not overlap');
    }
    const oneRow=boxes.every(b=>Math.abs(b.top-boxes[0].top)<3);
    if(fields.clientWidth>=520)check(oneRow,'Wide controls fit on one row');
    for(const element of [controls,fields,...labels,...fields.querySelectorAll('select,input')]){
      check(element.scrollWidth<=element.clientWidth+1,'Electrolaser control has no horizontal overflow');
      const b=rect(element),p=rect(controls);check(b.left>=p.left-1&&b.right<=p.right+1,'Electrolaser field fits its block');
    }
    check(rect(fields.querySelector('input')).width<90,'DR is a compact number field');
    const mode=fields.querySelector('[name=electrolaserMode]'),ms=style(mode),canvas=root.ownerDocument.createElement('canvas'),context=canvas.getContext('2d');
    context.font=ms.font;const textWidth=Math.max(...[...mode.options].map(o=>context.measureText(o.textContent).width));
    check(mode.clientWidth>=textWidth+parseFloat(ms.paddingLeft)+parseFloat(ms.paddingRight)+20,'Complete mode labels fit alongside the dropdown arrow');
    report.controls={oneRow,width:Math.round(rect(fields).width),height:Math.round(rect(controls).height),drWidth:Math.round(rect(fields.querySelector('input')).width)};
  }else check(!root.querySelector('[data-electrolaser-controls]'),'Other weapons have no electrolaser controls');
  return report;
}
