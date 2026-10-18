import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),fs=require('node:fs');require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {defaults}=require('../../lib/engine.ts');const id='migration-qa-'+randomUUID(),username='s'+randomBytes(12).toString('hex'),password=randomBytes(32).toString('base64url');
const q=value=>value===null?'NULL':"'"+String(value).replaceAll("'","''")+"'";const rows=defaults.map(shift=>`(${[id+'_'+shift.id,id,'shift','migration-qa',JSON.stringify(shift)].map(q).join(',')})`);
rows.push(`(${[id+'_pattern',id,'pattern','migration-qa',JSON.stringify({id:'pattern',name:'QA rotation',start:'2026-10-18',items:['day','night','off','off'],repeat:100})].map(q).join(',')})`);
const sql=`insert into shiftly_private.calendars(id,owner,name,timezone) values(${q(id)},'migration-qa','Migration QA','Europe/Malta');insert into shiftly_private.calendar_records(id,calendar_id,kind,author,data) values ${rows.join(',')};insert into shiftly_private.calendar_records(id,calendar_id,kind,author,private,data) values(${q('caldav_'+username)},${q(id)},'calendar_caldav','migration-qa',1,${q(JSON.stringify({username,passwordHash:createHash('sha256').update(password).digest('hex'),rosterId:'main'}))});`;
await writeFile('/tmp/shiftly-qa-fixture.sql',sql,{mode:0o600});await writeFile('/tmp/shiftly-qa-fixture.json',JSON.stringify({id,username,password}),{mode:0o600});console.log('Isolated migration fixture prepared');
