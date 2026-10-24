const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function checker(){const c={window:{}};vm.runInNewContext(fs.readFileSync('public/arduino-syntax.js','utf8'),c);return c.window.ArduinoSyntax.check;}
function examples(){const html=fs.readFileSync('pages/esp.html','utf8');const led=html.match(/<textarea id="code-editor"[^>]*>([\s\S]*?)<\/textarea>/)[1];const c={};vm.runInNewContext(html.match(/const lcdExample = (".*");/)[0]+'globalThis.code = lcdExample;',c);return {html,led,lcd:c.code};}
test('LED and LCD examples pass strict semicolon checks',()=>{const check=checker(),e=examples();assert.equal(check(e.led),true);assert.equal(check(e.lcd),true);});
test('missing semicolons fail before simulation and identify the line',()=>{const check=checker(),e=examples();for(const statement of ['lcd.init();','lcd.backlight();','lcd.print("Halo Mahasiswa!");','LiquidCrystal_I2C lcd(0x27, 16, 2);','delay(1000);']){const bad=e.lcd.replace(statement,statement.slice(0,-1));const line=bad.split('\n').findIndex(x=>x.includes(statement.slice(0,-1)))+1;assert.throws(()=>check(bad),error=>error.lineNumber===line&&error.message.includes("';'"));}});
test('comments, semicolons inside strings, and multiline statements are handled',()=>{const check=checker();assert.equal(check('#include <X.h>\nvoid setup()\n{\n// comment\nSerial.print(\n "text; // literal"\n); /* comment */\n}'),true);assert.throws(()=>check('void setup() {\n lcd.print("text;") // not a terminator\n}'),error=>error.lineNumber===2);assert.throws(()=>check('void setup() { lcd.init() }'));assert.throws(()=>check('void setup() {\n/* unfinished'));});
test('LCD example transpiles and writes both screen rows',async()=>{const {html,lcd}=examples();const start=html.indexOf('function transpileArduinoToJS(cppCode)'),end=html.indexOf('async function runSimulation()',start),calls=[];const c={window:{sys_lcd_setCursor:(col,row)=>calls.push(['cursor',col,row]),sys_lcd_print:text=>calls.push(['print',text])},sys_delay:async()=>{}};vm.createContext(c);vm.runInContext(html.slice(start,end),c);vm.runInContext(c.transpileArduinoToJS(lcd),c);await c.setup();assert.deepEqual(calls,[['cursor',0,0],['print','Halo Mahasiswa!'],['cursor',0,1],['print','ITENAS IoT Lab']]);assert.ok(html.indexOf('window.ArduinoSyntax.check(codeEditor.value)')<html.indexOf('const createRunner = new Function'));});


test('LCD requires its header and an object declaration before use',()=>{
 const check=checker(),{lcd,led}=examples();
 assert.equal(check(led),true);
 assert.throws(()=>check(lcd.replace('#include <LiquidCrystal_I2C.h>','')),e=>e.message.includes('#include <LiquidCrystal_I2C.h>'));
 assert.throws(()=>check(lcd.replace('LiquidCrystal_I2C lcd(0x27, 16, 2);','')),e=>e.message.includes("'lcd' was not declared"));
 assert.throws(()=>check(lcd.replace('#include <LiquidCrystal_I2C.h>','// #include <LiquidCrystal_I2C.h>')),e=>e.message.includes('#include'));
 assert.throws(()=>check(lcd.replace('LiquidCrystal_I2C lcd(0x27, 16, 2);','/* LiquidCrystal_I2C lcd(0x27, 16, 2); */')),e=>e.message.includes('was not declared'));
 assert.equal(check(lcd.replace('<LiquidCrystal_I2C.h>','"LiquidCrystal_I2C.h"')),true);
});
test('LCD rejects malformed constructors, duplicate objects, and name mismatches',()=>{
 const check=checker(),{lcd}=examples();
 assert.throws(()=>check(lcd.replace('(0x27, 16, 2)','(0x27, 16)')),e=>e.message.includes('3 argumen'));
 assert.throws(()=>check(lcd.replace('LiquidCrystal_I2C lcd(0x27, 16, 2);','LiquidCrystal_I2C lcd(0x27, 16, 2);\nLiquidCrystal_I2C lcd(0x27, 16, 2);')),e=>e.message.includes('lebih dari sekali'));
 assert.throws(()=>check(lcd.replace('LiquidCrystal_I2C lcd(', 'LiquidCrystal_I2C screen(')),e=>e.message.includes("'lcd' was not declared"));
 assert.throws(()=>check(lcd.replace('#include <LiquidCrystal_I2C.h>','#include <LiquidCrystal_I2C_WRONG.h>')),e=>e.message.includes('#include'));
});
