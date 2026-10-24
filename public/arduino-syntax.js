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
    return true;
  }
  function error(line,message){const e=new SyntaxError(`Baris ${line}: ${message}`);e.lineNumber=line;return e;}
  window.ArduinoSyntax={check};
})();
