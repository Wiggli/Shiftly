// Disposable local fixture; this module is substituted only by the test bundler.
import {AsyncLocalStorage} from 'node:async_hooks';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
const sql=new DatabaseSync(':memory:');
for(const file of readdirSync('drizzle').filter(name=>name.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+file,'utf8'));
class Statement {
 constructor(private query:string,private values:any[]=[]){}
 bind(...values:any[]){return new Statement(this.query,values);}
 async first(){return sql.prepare(this.query).get(...this.values)||null;}
 async all(){return {results:sql.prepare(this.query).all(...this.values),success:true};}
 async run(){const result=sql.prepare(this.query).run(...this.values);return {success:true,meta:{changes:Number(result.changes)}};}
}
export const env={DB:{prepare:(query:string)=>new Statement(query),async batch(statements:Statement[]){sql.exec('BEGIN');try{const output=[];for(const statement of statements)output.push(await statement.run());sql.exec('COMMIT');return output;}catch(error){sql.exec('ROLLBACK');throw error;}}}};
export const contextStorage=new AsyncLocalStorage<any>();
export async function getAppUser(){return contextStorage.getStore()||null;}
