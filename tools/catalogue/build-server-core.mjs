import fs from 'node:fs';
const root=new URL('../../',import.meta.url);
const source=fs.readFileSync(new URL('58-catalogue.js',root),'utf8');
const generated='/* GENERATED from 58-catalogue.js. Run node tools/catalogue/build-server-core.mjs. */\n'+source.replace(/^export /gm,'');
const target=new URL('backend/catalogue-core.js',root);
if(process.argv.includes('--check')){
 if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==generated)throw new Error('Catalogue backend core differs from its canonical source.');
}else fs.writeFileSync(target,generated);
