import {setTimeout as delay} from 'node:timers/promises';
import {pathToFileURL} from 'node:url';

export async function verifyLive({baseURL,expectedCommit,fetcher=fetch}){
 const base=new URL(baseURL);
 async function get(path){
  const url=new URL(path,base);url.searchParams.set('release-check',expectedCommit);
  const response=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(`${url.pathname}: HTTP ${response.status}`);
  return response.text();
 }
 const version=JSON.parse(await get('version.json'));
 if(version.commit!==expectedCommit)throw Error(`Live commit ${version.commit||'unknown'} does not match ${expectedCommit}`);
 if(!/^[a-f0-9]{10}$/.test(version.build))throw Error('Invalid live build identifier');
 const html=await get('./'),offline=await get('offline.html');
 for(const [name,body] of [['app',html],['offline shell',offline]]){
  if(!body.includes(`name="shiftly-build" content="${version.build}"`))throw Error(`${name} has a different build from version.json`);
 }
 const assets=[...html.matchAll(/(?:src|href)="([^"]+\/assets\/[^"?#]+\.(?:js|css))"/g)].map(match=>match[1]);
 if(!assets.some(path=>path.endsWith('.js'))||!assets.some(path=>path.endsWith('.css')))throw Error('Missing app JavaScript or CSS');
 const worker=await get('sw.js');
 if(!worker.includes('shiftly-pages-')||!worker.includes(base.pathname+'offline.html'))throw Error('Missing repository-scoped offline worker');
 for(const asset of new Set(assets)){
  const url=new URL(asset,base);
  if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))throw Error('App asset is outside Shiftly');
  if(!worker.includes(url.pathname))throw Error(`Worker does not precache ${url.pathname}`);
  await get(url.href);
 }
 return version;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const expectedCommit=process.env.GITHUB_SHA||process.argv[2];
 if(!/^[a-f0-9]{40}$/.test(expectedCommit||''))throw Error('Provide the full expected commit SHA');
 const baseURL='https://wiggli.github.io/Shiftly/';
 for(let attempt=1;attempt<=12;attempt++){
  try{const version=await verifyLive({baseURL,expectedCommit});console.log(`Verified live Shiftly build ${version.build}, commit ${version.commit}, HTML, CSS, JavaScript and offline shell`);break;}
  catch(error){console.error(`Live verification ${attempt}/12: ${error.message}`);if(attempt===12)throw error;await delay(10000);}
 }
}
