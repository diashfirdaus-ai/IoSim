const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('all four application pages parse and are outside the static output', () => {
 for (const page of ['index','dashboard','esp','raspi']) {
  const html = fs.readFileSync(`pages/${page}.html`,'utf8');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
   if(!/src=/.test(match[1]) && match[2].trim()) new vm.Script(match[2],{filename:page});
  }
  const shell = fs.readFileSync(`public/${page}.html`,'utf8');
  assert.ok(shell.includes('/auth.js'));
  assert.ok(!shell.includes('function runSimulation'));
 }
});
test('transport opens private user channel and forwards data',async () => {
 let topic,config,receive,subscribe,sent,removed;
 const channel={on(event,filter,cb){receive=cb;return this},subscribe(cb){subscribe=cb;return this},async send(payload){sent=payload;return 'ok'}};
 const window={IoT:{user:{id:'alice'},client:{channel(t,c){topic=t;config=c;return channel},removeChannel(c){removed=c}}},addEventListener(){}};
 vm.runInNewContext(fs.readFileSync('public/bridge.js','utf8'),{window,document:{},console,clearInterval});
 const socket=new window.IoTSocket();
 assert.equal(topic,'iot:alice'); assert.equal(config.config.private,true);
 let opened=false; socket.onopen=()=>opened=true; subscribe('SUBSCRIBED'); assert.equal(opened,true);
 socket.send(JSON.stringify({type:'WRITE',pin:'V0',value:42})); assert.equal(sent.payload.value,42);
 let received;socket.onmessage=e=>received=JSON.parse(e.data);receive({payload:{type:'WRITE',pin:'V0',value:12}});assert.equal(received.value,12);
 socket.close();assert.equal(socket.readyState,3);assert.equal(removed,channel);
});
test('private API rejects anonymous access and invalid page names',async()=>{
 const handler=require('../api/page');
 const res={status(code){this.code=code;return this},setHeader(){},json(body){this.body=body},end(){}};
 await handler({method:'GET',query:{name:'esp'},headers:{}},res);assert.equal(res.code,401);
 await handler({method:'GET',query:{name:'../esp'},headers:{}},res);assert.equal(res.code,404);
});
test('API verifies token and membership before returning protected HTML',async()=>{
 const handler=require('../api/page'); const oldFetch=global.fetch;
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_ANON_KEY='public-key';
 const req={method:'GET',query:{name:'esp'},headers:{authorization:'Bearer valid-test-token'}};
 const response=()=>({status(code){this.code=code;return this},setHeader(){},json(body){this.body=body},send(body){this.body=body},end(){}});
 try{
  global.fetch=async()=>({ok:false});let res=response();await handler(req,res);assert.equal(res.code,401);
  global.fetch=async url=>({ok:true,json:async()=>url.includes('/auth/')?{id:'alice'}:[]});res=response();await handler(req,res);assert.equal(res.code,403);
  global.fetch=async url=>({ok:true,json:async()=>url.includes('/auth/')?{id:'alice'}:[{user_id:'alice'}]});res=response();await handler(req,res);assert.ok(res.body.includes('function runSimulation'));
 } finally {global.fetch=oldFetch;}
});

test('registration UI elements and bridge database sync are present', async () => {
  const shell = fs.readFileSync('public/index.html', 'utf8');
  assert.ok(shell.includes('id="tab-register"'));
  assert.ok(shell.includes('id="tab-login"'));

  let upserted = [];
  const fakeClient = {
    channel() { return { on(){ return this; }, subscribe(cb){ cb('SUBSCRIBED'); return this; }, async send(){ return 'ok'; } }; },
    removeChannel() {},
    from(table) {
      return {
        upsert(data) { upserted.push({ table, data }); return Promise.resolve({ data, error: null }); },
        insert(data) { upserted.push({ table, data }); return Promise.resolve({ data, error: null }); },
        select() { return { eq() { return { eq() { return { maybeSingle() { return Promise.resolve({ data: { data: { test: true } } }); } }; }, then(cb) { cb({ data: [] }); return { catch() {} }; } }; } }; }
      };
    }
  };
  const window = { IoT: { user: { id: 'alice' }, client: fakeClient }, addEventListener() {} };
  vm.runInNewContext(fs.readFileSync('public/bridge.js', 'utf8'), { window, document: {}, console, clearInterval });
  assert.equal(typeof window.IoT.saveWorkspace, 'function');
  assert.equal(typeof window.IoT.loadWorkspace, 'function');
  assert.equal(typeof window.IoT.savePinData, 'function');

  await window.IoT.saveWorkspace('esp32', { code: 'void setup(){}' });
  assert.ok(upserted.some(u => u.table === 'iot_workspaces' && u.data.workspace_type === 'esp32'));

  await window.IoT.savePinData('V1', 100);
  assert.ok(upserted.some(u => u.table === 'iot_device_data' && u.data.pin === 'V1' && u.data.value === '100'));
});
