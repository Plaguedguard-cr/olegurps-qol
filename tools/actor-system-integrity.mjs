// QA structural comparison: all fields retained; object key order is immaterial.
export const independentCopy = value => structuredClone(value);
export function structuralDiff(before, after, path = '$') {
 const rows=[];
 function walk(a,b,p,ap=true,bp=true){
  if(ap===bp&&Object.is(a,b))return;
  const ao=a!==null&&typeof a==='object',bo=b!==null&&typeof b==='object';
  if(ap&&bp&&ao&&bo&&Array.isArray(a)===Array.isArray(b)){
   for(const key of [...new Set([...Object.keys(a),...Object.keys(b)])].sort())walk(a[key],b[key],Array.isArray(a)?`${p}[${key}]`:`${p}.${key}`,Object.hasOwn(a,key),Object.hasOwn(b,key));
   if(Array.isArray(a)&&a.length!==b.length)walk(a.length,b.length,p+'.length');
  }else rows.push({path:p,beforePresent:ap,afterPresent:bp,before:a===undefined?null:independentCopy(a),after:b===undefined?null:independentCopy(b),beforeType:a===null?'null':typeof a,afterType:b===null?'null':typeof b});
 }
 walk(before,after,path);return rows;
}
