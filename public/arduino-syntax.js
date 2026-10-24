(() => {
  function check(source) {
    // Retain line numbers while ignoring comments and string contents.
    let cleaned='', line=1, quote=null, block=false;
    for(let i=0;i<source.length;i++) {
      const c=source[i], next=source[i+1];
      if(block){if(c==='*'&&next==='/'){block=false;i++;cleaned+='  ';}else{cleaned+=c==='\n'?'\n':' ';if(c==='\n')line++;}continue;}
      if(quote){if(c==='\\'){cleaned+='  ';i++;continue;}if(c===quote){quote=null;cleaned+=' ';}else if(c==='\n'){throw error(line,'Teks belum ditutup dengan tanda kutip.');}else cleaned+=' ';continue;}
      if(c==='/'&&next==='*'){block=true;cleaned+='  ';i++;continue;}
      if(c==='/'&&next==='/'){while(i<source.length&&source[i]!=='\n'){cleaned+=' ';i++;}if(i<source.length){cleaned+='\n';line++;}continue;}
      if(c==='"'||c==="'"){quote=c;cleaned+='S';continue;}
      cleaned+=c;if(c==='\n')line++;
    }
    if(block)throw error(line,'Komentar blok belum ditutup.');
    if(quote)throw error(line,'Teks belum ditutup dengan tanda kutip.');
    const lines=cleaned.split('\n');let parens=0, brackets=0, pending='', pendingLine=1, directive=false;
    for(let i=0;i<lines.length;i++){
      let text=lines[i].trim();
      if(directive||text.startsWith('#')){directive=text.endsWith('\\');continue;}
      if(!text)continue;
      if(!pending)pendingLine=i+1;
      pending+=' '+text;
      for(const c of text){if(c==='(')parens++;if(c===')')parens--;if(c==='[')brackets++;if(c===']')brackets--;}
      if(parens<0||brackets<0)throw error(i+1,'Tanda kurung penutup tidak sesuai.');
      if(parens||brackets)continue;
      const next=lines.slice(i+1).map(x=>x.trim()).find(x=>x&&!x.startsWith('#'))||'';
      if(/[;{}:]$/.test(text)){
        // A closing brace cannot stand in for the semicolon on the statement before it.
        const beforeClose=text.match(/([^;{}]+)\s*}/);
        if(beforeClose&&beforeClose[1].trim()&&!/^(?:else|do)$/.test(beforeClose[1].trim()))throw error(i+1,"Tanda ';' wajib sebelum '}'.");
        pending='';continue;
      }
      if(next.startsWith('{')||/^\s*(?:if|else\s+if|for|while|switch)\s*\(/.test(pending)||/^\s*(?:else|do)\s*$/.test(pending)){pending='';continue;}
      if(/[=+\-*/%&|^!<>?,.(\\]$/.test(text)||/^(?:[+*/%&|^?.]|<<|>>|==|!=|<=|>=|\)|\]|;|,)/.test(next))continue;
      throw error(i+1,"Tanda ';' wajib di akhir pernyataan.");
    }
    if(parens||brackets)throw error(pendingLine,'Tanda kurung belum ditutup.');
    validateLCD(source, cleaned);
    return true;
  }
  function withoutComments(source) {
    return source.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, token => token.startsWith('/') ? token.replace(/[^\n]/g,' ') : token);
  }
  function validateLCD(source, cleaned) {
    const headers = withoutComments(source);
    const code = cleaned.replace(/^[ \t]*#[^\n]*/gm, text => ' '.repeat(text.length));
    const includes = [...headers.matchAll(/^\s*#\s*include\s*[<"]LiquidCrystal_I2C\.h[>"]/gm)];
    const lineAt = index => cleaned.slice(0,index).split('\n').length;
    const declarations = [...code.matchAll(/\bLiquidCrystal_I2C\s+([A-Za-z_]\w*)\s*\(([^;{}]*)\)\s*;/g)];
    const names = new Set(declarations.map(match => match[1]));
    const calls = [...code.matchAll(/\b([A-Za-z_]\w*)\s*\.\s*(init|begin|backlight|noBacklight|setCursor|clear|print|home|display|noDisplay|cursor|noCursor|blink|noBlink)\s*\(/g)]
      .filter(match => match[1] === 'lcd' || names.has(match[1]) || (!['Serial','Blynk','ITENAS','param'].includes(match[1]) && ['init','backlight','noBacklight','setCursor'].includes(match[2])));
    const typeUse = code.match(/\bLiquidCrystal_I2C\b/);
    if (!declarations.length && !calls.length && !typeUse) return;
    const first = declarations[0]?.index ?? calls[0]?.index ?? typeUse.index;
    if (!includes.some(match => match.index < first)) {
      throw error(lineAt(first), "'LiquidCrystal_I2C' tidak dikenali. Tambahkan #include <LiquidCrystal_I2C.h> sebelum deklarasi LCD.");
    }
    const objects = new Map();
    for (const declaration of declarations) {
      if (objects.has(declaration[1])) throw error(lineAt(declaration.index), `Objek '${declaration[1]}' dideklarasikan lebih dari sekali.`);
      const args = declaration[2].split(',').map(arg => arg.trim());
      if (args.length !== 3 || args.some(arg => !arg)) throw error(lineAt(declaration.index), 'Konstruktor LCD membutuhkan 3 argumen: alamat I2C, jumlah kolom, dan jumlah baris. Contoh: LiquidCrystal_I2C lcd(0x27, 16, 2);');
      objects.set(declaration[1], declaration);
    }
    if (typeUse && !declarations.length) throw error(lineAt(typeUse.index), 'Deklarasi LCD tidak lengkap. Gunakan LiquidCrystal_I2C lcd(0x27, 16, 2);');
    for (const call of calls) {
      const declaration = objects.get(call[1]);
      if (!declaration || declaration.index > call.index) throw error(lineAt(call.index), `'${call[1]}' was not declared in this scope. Deklarasikan LiquidCrystal_I2C ${call[1]}(0x27, 16, 2); sebelum digunakan.`);
    }
  }

  function error(line,message){const e=new SyntaxError(`Baris ${line}: ${message}`);e.lineNumber=line;return e;}
  window.ArduinoSyntax={check};
})();
