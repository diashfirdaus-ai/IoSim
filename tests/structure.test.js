const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('all application pages parse and are outside the static output', () => {
 for (const page of ['index','dashboard','esp','raspi','jetson','jetson-learn']) {
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
  const shell = fs.readFileSync('public/login.html', 'utf8');
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


test('ITENAS_WRITE callbacks receive dashboard values and accept legacy sketches', () => {
 const html = fs.readFileSync('pages/esp.html', 'utf8');
 const start = html.indexOf('function transpileArduinoToJS(cppCode)');
 const end = html.indexOf('async function runSimulation()', start);
 const context = { window: {}, values: [], sys_digitalWrite: (pin, value) => context.values.push([pin, value]) };
 vm.createContext(context);
 vm.runInContext(html.slice(start, end), context);
 for (const callback of ['ITENAS_WRITE', 'BLYNK_WRITE']) {
  const code = context.transpileArduinoToJS(`${callback}(V0) { int value = param.asInt(); digitalWrite(2, value); }`);
  vm.runInContext(code, context);
  context.window.ITENAS_WRITE_V0(1);
  context.window.ITENAS_WRITE_V0(0);
 }
 assert.deepEqual(context.values, [[2,1], [2,0], [2,1], [2,0]]);
 assert.ok(html.includes('const funcName = `ITENAS_WRITE_${data.pin}`'));
 assert.ok(fs.readFileSync('pages/raspi.html', 'utf8').includes('const funcName = `ITENAS_WRITE_${data.pin}`'));
});


test('Jetson demo handles decision thresholds and rejects invalid input',()=>{
 const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('public/jetson.js','utf8'),c);
 assert.equal(c.evaluateJetsonDemo('person',70).active,true);
 assert.equal(c.evaluateJetsonDemo('empty',70).active,false);
 assert.equal(c.evaluateJetsonDemo('uncertain',55).active,true);
 assert.equal(c.evaluateJetsonDemo('uncertain',70).active,false);
 assert.throws(()=>c.evaluateJetsonDemo('invalid',70));assert.throws(()=>c.evaluateJetsonDemo('person',NaN));
 assert.ok(fs.readFileSync('public/jetson.html','utf8').includes('/auth.js'));
 assert.ok(fs.readFileSync('pages/index.html','utf8').includes('href="jetson.html"'));
});


test('Jetson Python runs a GPIO blink with Jetson.GPIO and BOARD numbering', async () => {
 const html = fs.readFileSync('pages/jetson.html','utf8');
 const start = html.indexOf('function transpilePythonToJS(pyCode)');
 const end = html.indexOf('async function runSimulation()',start);
 const levels=[], modes=[];let running=true;
 const context={window:{sys_setmode:mode=>modes.push(mode),sys_pinMode(){},sys_digitalWrite:(pin,value)=>levels.push([pin,value]),sys_serial_println(){},sys_delay:async()=>{if(levels.length===2)running=false;},iotEngine:{getState:()=>({isSimulating:running})}}};
 vm.createContext(context);vm.runInContext(html.slice(start,end),context);
 const sample=html.match(/<textarea id="code-editor"[^>]*>([\s\S]*?)<\/textarea>/)[1];
 await vm.runInContext(`(async()=>{${context.transpilePythonToJS(sample)}})()`,context);
 assert.deepEqual(levels,[[18,1],[18,0]]);assert.deepEqual(modes,['BCM']);
 modes.length=0;
 const boardCode='import Jetson.GPIO as GPIO\nGPIO.setmode(GPIO.BOARD)\nGPIO.setup(12, GPIO.OUT)\nGPIO.output(12, GPIO.HIGH)';
 await vm.runInContext(`(async()=>{${context.transpilePythonToJS(boardCode)}})()`,context);
 assert.equal(modes[0],'BOARD');
 assert.ok(html.includes("window.IoT.saveWorkspace('jetson'"));
 assert.ok(html.includes('_jetson_python'));
 assert.ok(!html.includes("saveWorkspace('raspi'"));
 assert.ok(fs.readFileSync('public/jetson-simulator.css','utf8').includes('/jetson-real.svg'));
});


test('Jetson BOARD pin 12 maps to BCM18 and rejects invalid GPIO modes',()=>{
 const html=fs.readFileSync('pages/jetson.html','utf8');
 const start=html.indexOf("let gpioNumbering = 'BCM'");const end=html.indexOf('window.sys_analogRead',start);
 const c={window:{},state:{isSimulating:true,hw:{pins:{}}},evaluateCircuit(){}};vm.createContext(c);vm.runInContext(html.slice(start,end),c);
 c.window.sys_setmode('BOARD');c.window.sys_digitalWrite(12,1);assert.equal(c.state.hw.pins['18'],1);
 c.window.sys_setmode('BCM');c.window.sys_digitalWrite(18,0);assert.equal(c.state.hw.pins['18'],0);
 assert.throws(()=>c.window.sys_setmode('TEGRA_SOC'));c.window.sys_setmode('BOARD');assert.throws(()=>c.window.sys_pinMode(2,1));
});

test('Jetson Python callbacks and outbound dashboard writes use ITENAS channels',async()=>{
 const html=fs.readFileSync('pages/jetson.html','utf8');const start=html.indexOf('function transpilePythonToJS(pyCode)');const end=html.indexOf('async function runSimulation()',start);
 const outputs=[],writes=[];const c={window:{sys_digitalWrite:(pin,value)=>outputs.push([pin,value]),sys_blynk_virtualWrite:(pin,value)=>writes.push([pin,value])}};
 vm.createContext(c);vm.runInContext(html.slice(start,end),c);
 const code='def ITENAS_WRITE_V0(value):\n    GPIO.output(18, value)\nITENAS.virtualWrite("V1", 42)';
 vm.runInContext(c.transpilePythonToJS(code),c);await c.window.ITENAS_WRITE_V0(1);assert.deepEqual(outputs,[[18,1]]);assert.deepEqual(writes,[['V1',42]]);
});
