const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function environment(saved,blocked=false){
 const values=new Map(saved?[['itenas-iot-theme',saved]]:[]),buttons=[],events={};
 const root={dataset:{},style:{}};
 const make=()=>({dataset:{},attributes:{},listeners:{},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,v){this.listeners[k]=v;},appendChild(node){buttons.push(node);}});
 const c={document:{documentElement:root,readyState:'complete',getElementById:()=>null,querySelectorAll:()=>buttons,createElement:make,body:{appendChild(){}}},localStorage:{getItem(k){if(blocked)throw Error('blocked');return values.get(k)||null;},setItem(k,v){if(blocked)throw Error('blocked');values.set(k,v);}},window:{matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(k,v){events[k]=v;}}};
 vm.runInNewContext(fs.readFileSync('public/theme.js','utf8'),c);return {root,buttons,values,events};
}
test('theme selection persists, reloads, and follows cross-tab changes',()=>{
 const c=environment('dark');assert.equal(c.root.dataset.theme,'dark');
 c.buttons[0].listeners.click();assert.equal(c.root.dataset.theme,'light');assert.equal(c.values.get('itenas-iot-theme'),'light');assert.equal(c.buttons[0].attributes['aria-pressed'],'true');
 assert.equal(environment(c.values.get('itenas-iot-theme')).root.dataset.theme,'light');
 c.events.storage({key:'itenas-iot-theme',newValue:'dark'});assert.equal(c.root.dataset.theme,'dark');
});
test('themes work when browser storage is unavailable',()=>{
 const c=environment(null,true);assert.equal(c.root.dataset.theme,'light');c.buttons[1].listeners.click();assert.equal(c.root.dataset.theme,'dark');
});
test('all application pages and generated login load the shared theme',()=>{
 for(const name of ['index','dashboard','esp','raspi','jetson','jetson-learn']){
  for(const dir of ['pages','public']){const html=fs.readFileSync(`${dir}/${name}.html`,'utf8');assert.ok(html.includes('/theme.js'));assert.ok(html.includes('/theme.css'));}
 }
 const login=fs.readFileSync('public/login.html','utf8');assert.ok(login.includes('/theme.js'));assert.ok(login.includes('aria-selected="true"'));
});
