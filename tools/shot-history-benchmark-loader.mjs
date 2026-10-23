import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import {basename} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.env.OLEGURPS_HISTORY_BASELINE;
if(root){const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'));
 registerHooks({load(url,context,next){
  const key=Object.keys(manifest).find(k=>url.endsWith('/'+k));
  if(!key)return next(url,context);const source=readFileSync(root+'/'+basename(key));
  if(createHash('sha256').update(source).digest('hex')!==manifest[key])throw Error('Baseline hash mismatch: '+key);
  return {format:'module',source:source.toString('utf8'),shortCircuit:true};
 }});
}
