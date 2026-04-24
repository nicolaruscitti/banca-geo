// engine/extractors.js
// Dipendenze: nessuna (funzioni pure di parsing)
// Funzioni: extractProduct(t), extractYears(t), extractAgeRange(t),
//           extractSegments(t), extractCustomerId(t), extractRegion(t)

// ── entity extractors v8 ─────────────────────────────────────────
// Ordine: più specifico prima (ass.casa PRIMA di casa, ecc.)
function extractProduct(t){
  if(/assicurazione[\s\-]*casa|ass\.?\s*c\b/i.test(t)) return 6;
  if(/assicurazione[\s\-]*vita|ass\.?\s*v\b|\bvita\b/i.test(t)) return 5;
  if(/\bmutuo?\b|\bmutu[io]\b/i.test(t)) return 3;
  if(/investiment[io]?|\binv\b/i.test(t)) return 4;
  if(/carta[\s\-]*credito|\bcredit[io]?\b|\bcred\b/i.test(t)) return 2;
  if(/carta[\s\-]*debito|\bdebito?\b|\bdeb\b|bancomat/i.test(t)) return 1;
  if(/conto[\s\-]*corrente|\bc\/c\b|\bconto\b/i.test(t)) return 0;
  return null;
}

function extractYears(t){
  const wm={uno:1,due:2,tre:3,quattro:4,cinque:5,sei:6,sette:7,otto:8,nove:9,dieci:10};
  for(const [k,v] of Object.entries(wm)){
    if(new RegExp('\\b'+k+'\\b','i').test(t)) return v;
  }
  const m=t.match(/(\d+)\s*ann/i);
  if(m){const v=+m[1];if(v>=1&&v<=50) return v;}
  return 5;
}

function extractAgeRange(t){
  let m=t.match(/(\d{2})\s*[-\u2013\u2014]\s*(\d{2})/);
  if(m) return{min:+m[1],max:+m[2]};
  m=t.match(/tra\s+(?:i\s+)?(\d{2})\s+e\s+(?:i\s+)?(\d{2})/i);
  if(m) return{min:+m[1],max:+m[2]};
  if(/giovani|under.?30/i.test(t)) return{min:18,max:30};
  if(/over.?50|senior|anzian/i.test(t)) return{min:50,max:79};
  return null;
}

function extractSegments(t){
  const s=[];
  if(/\bsingle\b/i.test(t)) s.push(0);
  if(/\bcoppi/i.test(t)) s.push(1);
  if(/\bfamigl/i.test(t)) s.push(2);
  if(s.length===0){s.push(0);s.push(1);}
  else if(s.length===1){
    if(s[0]===0) s.push(1);
    else if(s[0]===1) s.push(2);
    else s.unshift(0);
  }
  return s;
}

function extractCustomerId(t){
  const m=t.match(/#\s*(\d+)|id\s*[=:]?\s*(\d+)|cliente\s+n\.?\s*(\d+)|cliente\s+#?(\d+)/i);
  if(m){const v=+(m[1]||m[2]||m[3]||m[4]);if(v>=1&&v<=10000) return v;}
  return null;
}

function extractRegion(t){
  const r=[];
  if(/nord[\s\-]*ovest/i.test(t)) r.push('Nord Ovest');
  if(/nord[\s\-]*est/i.test(t)) r.push('Nord Est');
  if(/\bnord\b/i.test(t)&&!r.length){r.push('Nord Ovest');r.push('Nord Est');}
  if(/\bcentro\b/i.test(t)) r.push('Centro');
  if(/\bsud\b/i.test(t)) r.push('Sud');
  if(/\bisole\b/i.test(t)) r.push('Isole');
  return r;
}

function extractCity(t){
  if(typeof CITIES==='undefined') return null;
  // ordina per lunghezza decrescente per evitare match parziali
  const sorted=[...CITIES].sort((a,b)=>b.name.length-a.name.length);
  for(const c of sorted){
    if(t.includes(c.name.toLowerCase())) return c.id;
  }
  return null;
}

function extractStatoFilter(t){
  const s=[];
  if(/\bsingle\b/i.test(t)) s.push(0);
  if(/\bcoppi/i.test(t)) s.push(1);
  if(/\bfamigl/i.test(t)) s.push(2);
  return s; // array vuoto = nessun filtro
}

function extractIncomeRange(t){
  const hasCtx=/\breddit[oi]\b|stipendi|guadagn|€|euro\b/i.test(t);
  let m;
  // "tra Xk e Yk"
  m=t.match(/tra\s+(\d+)\s*k\s+e\s+(\d+)\s*k/i);
  if(m) return{min:+m[1]*1000,max:+m[2]*1000};
  // "reddito tra X e Y" (con contesto income)
  if(hasCtx){
    m=t.match(/tra\s+(\d+)\s+e\s+(\d+)/i);
    if(m){const a=+m[1],b=+m[2];return{min:a<500?a*1000:a,max:b<500?b*1000:b};}
  }
  // "sotto Xk" / "meno di Xk"
  m=t.match(/(?:sotto|meno di|under|inferiore a)\s+(\d+)\s*k/i);
  if(m) return{min:0,max:+m[1]*1000};
  if(hasCtx){m=t.match(/(?:sotto|meno di)\s+(\d+)/i);if(m&&+m[1]<500) return{min:0,max:+m[1]*1000};}
  // "sopra Xk" / "oltre Xk"
  m=t.match(/(?:sopra|pi[uù] di|oltre|over|superiore a)\s+(\d+)\s*k/i);
  if(m) return{min:+m[1]*1000,max:Infinity};
  if(hasCtx){m=t.match(/(?:sopra|pi[uù] di|oltre)\s+(\d+)/i);if(m&&+m[1]<500) return{min:+m[1]*1000,max:Infinity};}
  return null;
}
