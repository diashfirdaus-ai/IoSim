const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
function library(){const c={window:{}};vm.runInNewContext(fs.readFileSync('public/resistor.js','utf8'),c);return c.window.LabResistor;}
function pin(id,name,board=false){return {getAttribute:key=>key==='data-pin-id'?id:name,closest:()=>board?{}:null};}
function resistor(a,b,value=220){return {getAttribute:()=>String(value),querySelectorAll:()=>[a,b]};}
test('LED stays controllable through a resistor on either terminal',()=>{
 const r=library(),high=pin('gpio','18',true),ground=pin('gnd','gnd',true),anode=pin('led_a','anode'),cathode=pin('led_c','cathode'),a=pin('res_a','res_a'),b=pin('res_b','res_b');
 const wire=(pin1,pin2)=>({pin1,pin2});
 const wires=[wire(high,a),wire(b,anode),wire(cathode,ground)];
 let net=r.network(wires,[resistor(a,b)],{18:1,gnd:0});assert.equal(net.hasLevel('led_a',1),true);assert.equal(net.hasLevel('led_c',0),true);
 net=r.network(wires,[resistor(a,b)],{18:0,gnd:0});assert.equal(net.hasLevel('led_a',1),false);
 net=r.network([wire(high,anode),wire(cathode,b),wire(a,ground)],[resistor(a,b)],{18:1,gnd:0});assert.equal(net.hasLevel('led_a',1),true);assert.equal(net.hasLevel('led_c',0),true);
 net=r.network([wire(high,a),wire(cathode,ground)],[resistor(a,b)],{18:1,gnd:0});assert.equal(net.hasLevel('led_a',1),false);
 net=r.network(wires,[],{18:1,gnd:0});assert.equal(net.hasLevel('led_a',1),false);
});
test('direct wiring remains supported and a cyclic network terminates',()=>{
 const r=library(),high=pin('gpio','18',true),led=pin('led','anode'),a=pin('a','res_a'),b=pin('b','res_b');
 const wires=[{pin1:high,pin2:led},{pin1:led,pin2:a},{pin1:b,pin2:led}];
 const net=r.network(wires,[resistor(a,b)],{18:1});assert.equal(net.hasLevel('led',1),true);assert.equal(net.hasLevel('led',0),false);
});
test('resistor saved value restores its selector and colored bands',()=>{
 const r=library(),nodes={'.resistor-select':{},'.resistor-value':{},'.resistor-body':{setAttribute(){}}},bands=[{style:{}},{style:{}},{style:{}}],saved={};
 const component={setAttribute(k,v){saved[k]=v;},querySelector:s=>nodes[s],querySelectorAll:()=>bands};
 r.configure(component,'1000');assert.equal(saved['data-value'],1000);assert.equal(nodes['.resistor-select'].value,'1000');assert.equal(nodes['.resistor-value'].textContent,'1 kΩ');assert.equal(bands[1].style.backgroundColor,'#171717');
 r.configure(component,'bad');assert.equal(saved['data-value'],220);
});
test('all simulators expose and restore resistor components',()=>{
 for(const page of ['esp','raspi','jetson']){const html=fs.readFileSync(`pages/${page}.html`,'utf8');assert.ok(html.includes('data-type="resistor"'));assert.ok(html.includes('/resistor.js'));assert.ok(html.includes('window.LabResistor.configure(el, value)'));assert.ok(html.includes('window.LabResistor.network('));}
});
