const fs=require('node:fs'),{test}=require('node:test'),assert=require('node:assert/strict'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
const {scopeSnapshot,assertScopedChanges}=require('../lib/sharing.ts'),{calendarRosters,rosterSnapshot}=require('../lib/rosters.ts'),{applyChanges}=require('../lib/calendar-state.ts'),{defaults}=require('../lib/engine.ts'),{shiftChoices}=require('../lib/shift-choices.ts');
const snapshot={calendar:{id:'family',settings:{overlayCalendar:'private-other',shiftOrder:['day','night','off','leave']}},rosters:[{id:'main',name:'Andre',color:'#123456'},{id:'wife',name:'Wife',color:'#654321'}],shifts:[...defaults,{...defaults[0],id:'private-custom',name:'Private custom shift'}],patterns:[{id:'p',rosterId:'wife',name:'Wife cycle',items:['night','off'],start:'2026-11-01',repeat:100},{id:'secret-pattern',name:'Andre private pattern',items:['day'],start:'2026-11-01',repeat:100}],occurrences:[],events:[{id:'e',rosterId:'wife',title:'Shared event'},{id:'other',title:'Andre secret entry'}],audit:[{id:'a',summary:'Andre secret entry updated'}]};
test('Single-roster snapshots filter rosters, patterns, events, custom shift definitions, overlay settings and audit titles',()=>{const scoped=scopeSnapshot(snapshot,'wife');assert.deepEqual(scoped.rosters.map(r=>r.id),['wife']);assert.deepEqual(scoped.shifts.map(r=>r.id),defaults.map(r=>r.id));assert.deepEqual(scoped.patterns.map(r=>r.id),['p']);assert.deepEqual(scoped.events.map(r=>r.id),['e']);assert.equal(scoped.calendar.settings.overlayCalendar,undefined);assert.ok(!JSON.stringify(scoped).includes('Andre secret'));assert.ok(!JSON.stringify(scoped).includes('Private custom shift'));assert.equal(calendarRosters(scoped).length,1);assert.equal(rosterSnapshot(scoped,'missing').activeRosterId,'wife');assert.equal(scopeSnapshot(snapshot,null),snapshot);});
test('Scoped edits reject guessed foreign record IDs, moved records, calendar settings and shared shift changes',()=>{for(const change of [{kind:'event',id:'other',remove:true},{kind:'event',id:'other',data:{rosterId:'wife'}},{kind:'roster',id:'wife',data:{}},{kind:'settings',data:{}},{kind:'shift',id:'night',data:{...defaults[1],rosterId:'wife'}},{kind:'pattern',id:'new',data:{rosterId:'wife',items:['private-custom']}}])assert.throws(()=>assertScopedChanges(snapshot,'wife',[change]));assert.doesNotThrow(()=>assertScopedChanges(snapshot,'wife',[{kind:'occurrence',id:'wife:2026-11-20',data:{rosterId:'wife',shiftId:'night'}}]));});
test('Roster editors can create their own types but those types cannot be used in another roster',()=>{const type={...defaults[0],id:'wife-type',rosterId:'wife'};const changes=[{kind:'shift',id:type.id,data:type},{kind:'pattern',id:'new',data:{id:'new',rosterId:'wife',name:'New',items:[type.id],start:'2026-11-01',repeat:100}}];assert.doesNotThrow(()=>assertScopedChanges(snapshot,'wife',changes));const next=applyChanges({...snapshot,events:[]},changes);assert.throws(()=>applyChanges(next,[{kind:'pattern',id:'foreign',data:{id:'foreign',name:'Foreign',items:[type.id],start:'2026-11-01',repeat:1}}]),/another roster/);});
test('Imported shift choices prefer used definitions without merging or deleting saved data',()=>{const imported={...defaults[0],id:'imported-day',color:'#333399'};const state={...snapshot,patterns:[],occurrences:[{shiftId:'imported-day'}],shifts:[...defaults,imported]};assert.deepEqual(shiftChoices(state).filter(s=>s.name==='Day').map(s=>s.id),['imported-day']);assert.equal(state.shifts.length,5);});
test('Sharing defaults to view permission, names the scope and retains native sending and access controls',()=>{const Share=require('../app/ui/ShareManager.tsx').default;const html=renderToStaticMarkup(React.createElement(Share,{s:{...snapshot,role:'owner',activeRosterId:'wife',members:[],invites:[]},identity:{id:'owner'},command:()=>{},reload:()=>{},notice:()=>{},onClose:()=>{}}));assert.ok(html.includes('Schedule to share'));assert.ok(html.includes('including future schedules'));assert.match(html, /name="share-role"[^>]*checked=""[^>]*value="viewer"/);assert.ok(html.includes('Only Wife'));assert.ok(html.includes('Their Google account email'));});
test('A populated Off roster remains Today instead of presenting a fresh-calendar empty state',()=>{const Today=require('../app/ui/TodayView.tsx').default;const html=renderToStaticMarkup(React.createElement(Today,{s:{calendar:{timezone:'Europe/Malta'},shifts:defaults,patterns:[{id:'off-only',name:'Off',items:['off'],start:'2026-01-01',repeat:0}],occurrences:[],events:[]},open:()=>{}}));assert.ok(html.includes('Off'));assert.ok(html.includes('No upcoming working shift scheduled'));assert.ok(!html.includes('A fresh calendar'));});

test('Sharing makes access and recoverable pending links visible, excluding expired and cancelled invitations',()=>{
 const Share=require('../app/ui/ShareManager.tsx').default;
 const s={...snapshot,role:'owner',activeRosterId:'wife',members:[{id:'m',email:'partner@example.com',role:'editor',roster_id:'wife'}],invites:[{id:'live-token',email:'friend@example.com',role:'viewer',roster_id:null,revoked:0,expires:'2099-11-01T00:00:00.000Z'},{id:'expired-secret',email:'expired@example.com',revoked:0,expires:'2000-01-01T00:00:00.000Z'},{id:'revoked-secret',email:'revoked@example.com',revoked:1,expires:'2099-11-01T00:00:00.000Z'}]};
 const html=renderToStaticMarkup(React.createElement(Share,{s,identity:{id:'owner'},command:()=>{},reload:()=>{},notice:()=>{},onClose:()=>{}}));
 for(const label of ['People with access','Pending invitations','Send link','Copy link','Cancel invitation','partner@example.com','invite=live-token'])assert.ok(html.includes(label),label);
 assert.ok(!html.includes('expired-secret'));assert.ok(!html.includes('revoked-secret'));
 const viewer=renderToStaticMarkup(React.createElement(Share,{s:{...s,role:'viewer',rosterScope:'wife'},identity:{id:'viewer'},onClose:()=>{}}));
 assert.ok(!viewer.includes('live-token'));assert.ok(!viewer.includes('Remove access'));assert.ok(viewer.includes('The owner manages invitations'));
});
test('Radio choices cannot inherit full-width text field sizing and long sharing labels can wrap',()=>{
 const css=fs.readFileSync('app/globals.css','utf8');
 assert.ok(!/(?:^|})\s*input,textarea,select\s*\{/.test(css));
 assert.match(css,/input:not\(\[type=radio\]\):not\(\[type=checkbox\]\),textarea,select/);
 assert.match(css,/\.choice-option input\[type=radio\]\{[^}]*width:20px;[^}]*flex:0 0 20px/);
 assert.match(css,/\.choice-option span\{[^}]*min-width:0;[^}]*overflow-wrap:anywhere/);
});

test('Owner-aware naming never calls a received default roster My Schedule',()=>{
 const {scheduleIdentity,scheduleChoices}=require('../lib/schedule-identity.ts');
 assert.equal(scheduleIdentity({owner_name:'Andre Silva'},{id:'main',name:'My Roster'},'viewer').title,'Andre Silva’s Schedule');
 assert.equal(scheduleIdentity({owner_name:'Andre Silva'},{id:'main',name:'My Roster'},'owner').title,'My Schedule');
 assert.equal(scheduleIdentity({owner_name:'owner@example.com'},{name:'My Roster'},'viewer').title,'Shared Schedule');
 const choices=scheduleChoices([{id:'family',owner_name:'Maria Perez',role:'editor',rosters:[{id:'a',name:'Agency'},{id:'b',name:'Hospital'}]}]);
 assert.deepEqual(choices.map(c=>c.title),['Maria Perez’s Schedule','Maria Perez’s Schedule']);assert.deepEqual(choices.map(c=>c.detail),['Agency','Hospital']);assert.equal(choices[0].permission,'Can edit');
});

test('Authenticated live transport parses chunked grant messages and stops after revocation',async()=>{
 const {AuthenticatedStream}=require('../lib/authenticated-stream.ts');let calls=0;const messages=[];
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Stream did not deliver')),1000);
  const stream=new AuthenticatedStream('/api/live',async()=>{calls++;const encoder=new TextEncoder();return new Response(new ReadableStream({start(controller){for(const chunk of ['data: {"revision":3,','"role":"editor"}\n\n','data: {"revoked":true}\n\n'])controller.enqueue(encoder.encode(chunk));controller.close();}}));});
  stream.onmessage=event=>{const data=JSON.parse(event.data);messages.push(data);if(data.revoked){stream.close();clearTimeout(timer);resolve();}};
 });
 assert.equal(calls,1);assert.deepEqual(messages,[{revision:3,role:'editor'},{revoked:true}]);
});
test('A forbidden live reconnect signals revocation instead of retrying forever',async()=>{
 const {AuthenticatedStream}=require('../lib/authenticated-stream.ts');let calls=0;
 const message=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Missing revocation')),1000);const stream=new AuthenticatedStream('/api/live',async()=>{calls++;return new Response('',{status:403});});stream.onmessage=event=>{clearTimeout(timer);resolve(JSON.parse(event.data));};});
 assert.deepEqual(message,{revoked:true});assert.equal(calls,1);
});

test('A guest or preview schedule is personal even when its legacy catalog has no role',()=>{
 const Switcher=require('../app/ui/ScheduleSwitcher.tsx').default;
 const state={calendar:{id:'guest',name:'My calendar'},role:'owner',calendars:[{id:'guest',name:'My calendar'}]};
 const html=renderToStaticMarkup(React.createElement(Switcher,{s:state,catalog:state.calendars,rosters:[{id:'main',name:'My roster'}],active:'main',onClose:()=>{}}));
 assert.ok(html.includes('My Schedule'));assert.ok(html.includes('Your schedule'));assert.ok(html.includes('No schedules have been shared with you yet.'));assert.ok(!html.includes('Shared by Schedule owner'));
});

test('An editor is told when another author’s notes are private',()=>{
 const Editor=require('../app/ui/EventEditor.tsx').default;
 const html=renderToStaticMarkup(React.createElement(Editor,{value:{id:'shared-entry',date:'2026-11-01',title:'Overtime',emoji:'⏱️',time:'',notes:'',notesPrivate:true,private:false,author:'andre',reminders:[]},identity:{id:'maria'},writable:true,shared:true,onClose:()=>{}}));
 assert.ok(html.includes('These notes are private to their author'));assert.ok(html.includes('Only the author'));assert.ok(!html.includes('Only me'));
});
test('A viewer can inspect a repeating schedule without opening editable fields',()=>{
 const Details=require('../app/ui/PatternDetails.tsx').default;
 const html=renderToStaticMarkup(React.createElement(Details,{pattern:{name:'Usual work',items:['day','night','off'],start:'2026-11-01',repeat:0},s:{shifts:defaults},onClose:()=>{}}));
 assert.ok(html.includes('Repeats continuously'));assert.ok(html.includes('View only'));assert.ok(!/<(?:input|textarea|select)\b/.test(html));assert.ok(!html.includes('Show my shifts'));
});

test('Google sign-in retains the intended invitation without restoring expired or arbitrary URLs',()=>{
 const {rememberInvitation,restoreInvitation}=require('../lib/invitation-navigation.ts');const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const token='c1b6a134-a621-41fd-a02f-3cfc15b2b12a',second='13c45e62-3714-4b0b-a6fa-d64134f46658',root='https://wiggli.github.io/Shiftly/';
 rememberInvitation(new URL(root+'?invite='+token),storage,1000);assert.equal(restoreInvitation(new URL(root),storage,2000),root+'?invite='+token);assert.equal(values.size,0);
 rememberInvitation(new URL(root+'?invite='+token),storage,1000);assert.equal(restoreInvitation(new URL(root+'?invite='+second),storage,2000),root+'?invite='+second);
 rememberInvitation(new URL(root+'?invite='+token),storage,1000);assert.equal(restoreInvitation(new URL(root),storage,1000+7*86400000),root);
 rememberInvitation(new URL(root+'?invite=https://untrusted.invalid'),storage,1000);assert.equal(values.size,0);
});
