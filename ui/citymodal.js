// ui/citymodal.js
// Dipendenze: globals (CITIES, HISTORY, PRODUCTS, PSHORT, STATUS_LABELS),
//             data (CUSTOMER_REVENUES), ui/map.js (cityAgg),
//             ui/panel.js (getCityCustomers)
// Funzioni: openCityModal(cityId), closeCityModal()

// ── State ─────────────────────────────────────────────────────────────────────
let _mcId        = null;
let _mcView      = 'prod';   // 'prod' | 'rev'
let _mcYear      = 0;        // 0 | 2 | 5 | 10
let _mcStratOpen = true;

const PROD_COLORS = [
  '#4f8ef7',  // 0 C/C
  '#a78bfa',  // 1 Carta Debito
  '#22d3c8',  // 2 Carta Credito
  '#fbbf24',  // 3 Mutuo
  '#34d399',  // 4 Investimenti
  '#fb7185',  // 5 Ass. Vita
  '#f97316'   // 6 Ass. Casa
];

// ── Public API ────────────────────────────────────────────────────────────────
function openCityModal(cityId){
  _mcId   = cityId;
  _mcView = 'prod';
  _mcYear = 0;
  _mcStratOpen = true;

  const ov = document.getElementById('cmod-overlay');
  ov.style.display = 'flex';

  const city = (typeof cityAgg!=='undefined' && cityAgg[cityId])
             || CITIES.find(c=>c.id===cityId);
  document.getElementById('cmod-city-name').textContent = city ? city.name : '—';
  document.getElementById('cmod-city-reg').textContent  = city
    ? city.reg + (city.count ? ' · '+city.count.toLocaleString('it-IT')+' clienti' : '')
    : '—';

  _syncBtns();
  document.getElementById('cmod-strat-body').style.display = '';
  document.getElementById('cmod-strat-toggle').style.transform = '';
  // Defer render by one frame so the browser has laid out the modal
  // and wrap.clientWidth returns the correct value for canvas sizing.
  requestAnimationFrame(_mcRefresh);
}

function closeCityModal(){
  document.getElementById('cmod-overlay').style.display = 'none';
  _mcId = null;
}

// ── Internal controls ─────────────────────────────────────────────────────────
function _syncBtns(){
  document.querySelectorAll('#cmod-view-btns .cmod-ctrl-btn').forEach(b=>{
    b.classList.toggle('cmod-active', b.dataset.view===_mcView);
  });
  document.querySelectorAll('#cmod-year-btns .cmod-ctrl-btn').forEach(b=>{
    b.classList.toggle('cmod-active', +b.dataset.year===_mcYear);
  });
}

function _setCMView(v){
  _mcView=v;
  // Ripristina year-btns visibility quando si esce da churn
  const yb=document.getElementById('cmod-year-btns');
  if(yb) yb.style.visibility=(v==='churn'||v==='waterfall'?'hidden':'');
  _syncBtns(); _mcRefresh();
}
function _setCMYear(y){
  _mcYear=y; _syncBtns(); _mcRefresh();
}
function _toggleCMStrategy(){
  _mcStratOpen = !_mcStratOpen;
  document.getElementById('cmod-strat-body').style.display   = _mcStratOpen ? '' : 'none';
  document.getElementById('cmod-strat-toggle').style.transform = _mcStratOpen ? '' : 'rotate(180deg)';
}

// ── Master refresh ────────────────────────────────────────────────────────────
function _mcRefresh(){
  if(!_mcId) return;

  const custs = getCityCustomers(_mcId);

  // Vista Churn Risk: bypass canvas prodotti/rev
  if(_mcView === 'churn'){
    _mcRenderChurn(custs);
    return;
  }

  // Vista Revenue Waterfall: bypass canvas prodotti/rev
  if(_mcView === 'waterfall'){
    _mcRenderWaterfall(custs);
    return;
  }

  // Resize canvas to container
  const canvas = document.getElementById('cmod-canvas');
  const wrap   = document.getElementById('cmod-canvas-wrap');
  if(wrap.clientWidth > 0) canvas.width = wrap.clientWidth;
  canvas.height = 200;

  if(!custs || !custs.length){
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.font = '12px DM Mono,monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Nessun cliente nella selezione attuale', canvas.width/2, canvas.height/2);
    document.getElementById('cmod-diff').style.display = 'none';
    document.getElementById('cmod-strat-body').innerHTML =
      '<p style="color:var(--muted);font-size:11px;padding:10px 0">Nessun dato disponibile.</p>';
    return;
  }

  const cur = _mcCalcCur(custs);

  if(_mcYear === 0){
    _mcDrawHist(cur, null, false);
    document.getElementById('cmod-diff').style.display = 'none';
  } else {
    const fut = _mcProject(custs, _mcYear, cur);
    _mcDrawHist(fut, cur, true);
    _mcRenderDiff(cur, fut);
    document.getElementById('cmod-diff').style.display = '';
  }

  const city = CITIES.find(c=>c.id===_mcId);
  _mcRenderStrat(city, custs, cur);
}

// ── Current snapshot ──────────────────────────────────────────────────────────
function _mcCalcCur(custs){
  const n = custs.length;
  const prodCount = new Array(7).fill(0);
  const revSum    = new Array(7).fill(0);

  _buildRevenueCache();
  for(const c of custs){
    for(let i=0;i<7;i++){
      if(c.pmask & (1<<i)){
        prodCount[i]++;
        const rv = CUSTOMER_REVENUES[c.id];
        if(rv) revSum[i] += rv[i];
      }
    }
  }

  return {
    n,
    prodCount,
    penetration:  prodCount.map(v=>v/n),
    avgRev:       prodCount.map((v,i)=>v ? revSum[i]/v : 0),
    totalRev:     revSum,
    revPerCust:   revSum.map(v=>v/n)
  };
}

// ── Markov chain projection ───────────────────────────────────────────────────
function _mcProject(custs, years, cur){
  // Transition rates from HISTORY (same logic as projection.js)
  let s2c=0,c2f=0,s2f=0,fromS=0,fromC=0;
  if(typeof HISTORY !== 'undefined'){
    for(const e of Object.values(HISTORY)){
      if(e.length<2) continue;
      const f=e[0][1], l=e[e.length-1][1];
      if(f===0){ fromS++; if(l===1) s2c++; else if(l===2) s2f++; }
      else if(f===1){ fromC++; if(l===2) c2f++; }
    }
  }
  const rS2C = fromS ? s2c/fromS : 0.05;
  const rS2F = fromS ? s2f/fromS : 0.02;
  const rC2F = fromC ? c2f/fromC : 0.04;
  // Convert total-period rates → annual
  const aS2C = 1-Math.pow(1-rS2C,1/3);
  const aS2F = 1-Math.pow(1-rS2F,1/3);
  const aC2F = 1-Math.pow(1-rC2F,1/3);

  // Per-status product adoption rates
  const sCnt  = [0,0,0];
  const sMask = [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]];
  for(const c of custs){
    sCnt[c.stato]++;
    for(let b=0;b<7;b++) if(c.pmask&(1<<b)) sMask[c.stato][b]++;
  }
  const sPct = sMask.map((m,si)=>m.map(v=>sCnt[si]?v/sCnt[si]:0));

  // Project status distribution
  let fS=sCnt[0], fC=sCnt[1], fF=sCnt[2];
  for(let y=0;y<years;y++){
    const dS2C=fS*aS2C, dS2F=fS*aS2F, dC2F=fC*aC2F;
    fS=Math.max(0,fS-dS2C-dS2F);
    fC=Math.max(0,fC+dS2C-dC2F);
    fF=Math.max(0,fF+dS2F+dC2F);
  }
  const fTot = fS+fC+fF || 1;

  // Projected product penetration (demographic mix shift)
  const futPenet = [];
  for(let pi=0;pi<7;pi++){
    futPenet.push((fS*sPct[0][pi]+fC*sPct[1][pi]+fF*sPct[2][pi])/fTot);
  }

  // Organic cross-sell growth: low-penetration products close gap faster
  for(let pi=0;pi<7;pi++){
    const gap = 1-futPenet[pi];
    futPenet[pi] = Math.min(1, futPenet[pi] + gap*0.012*years);
  }

  const n = custs.length;

  // Projected revenues (adjust Ass.Vita for aging; others stay proportional)
  _buildRevenueCache();
  const futRevSum = new Array(7).fill(0);
  for(const c of custs){
    const rv = CUSTOMER_REVENUES[c.id];
    if(!rv) continue;
    for(let i=0;i<7;i++){
      let r = rv[i];
      if(i===5){  // Ass.Vita: inversely proportional to age
        const newAge = Math.min(79, c.eta+years);
        const a = Math.min(1,Math.max(0,(newAge-18)/61));
        r = Math.round(50-a*42);
      }
      futRevSum[i] += r * futPenet[i];
    }
  }

  return {
    n,
    prodCount:   futPenet.map(p=>Math.round(p*n)),
    penetration: futPenet,
    avgRev:      cur.avgRev,
    totalRev:    futRevSum,
    revPerCust:  futRevSum.map(v=>v/n),
    fS, fC, fF, fTot
  };
}

// ── Canvas histogram ──────────────────────────────────────────────────────────
function _mcDrawHist(data, ref, isFut){
  const canvas = document.getElementById('cmod-canvas');
  const ctx    = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);

  const vals = _mcView==='prod'
    ? data.penetration.map(v=>v*100)
    : data.revPerCust;
  const refVals = ref
    ? (_mcView==='prod' ? ref.penetration.map(v=>v*100) : ref.revPerCust)
    : null;

  const maxVal = Math.max(...vals, refVals?Math.max(...refVals):0, 0.001);

  const PL=48, PR=12, PT=26, PB=52;
  const plotW=W-PL-PR, plotH=H-PT-PB;
  const barW = Math.floor(plotW/7)-5;
  const gap  = (plotW-barW*7)/7;

  // Grid
  ctx.strokeStyle='rgba(255,255,255,0.06)';
  ctx.lineWidth=1;
  for(let i=0;i<=4;i++){
    const gy = PT+plotH-(i/4)*plotH;
    ctx.beginPath(); ctx.moveTo(PL,gy); ctx.lineTo(W-PR,gy); ctx.stroke();
    const gv = maxVal*i/4;
    ctx.fillStyle='rgba(255,255,255,0.28)';
    ctx.font='9px DM Mono,monospace';
    ctx.textAlign='right';
    ctx.fillText(_mcView==='prod' ? Math.round(gv)+'%' : '€'+Math.round(gv), PL-4, gy+3);
  }

  for(let i=0;i<7;i++){
    const x = PL + i*(barW+gap) + gap/2;
    const v = vals[i];
    const bH = (v/maxVal)*plotH;
    const by = PT+plotH-bH;

    // Ghost bar (reference)
    if(isFut && refVals){
      const rH=(refVals[i]/maxVal)*plotH;
      ctx.fillStyle='rgba(255,255,255,0.07)';
      ctx.fillRect(x, PT+plotH-rH, barW, rH);
    }

    // Main bar
    ctx.fillStyle = PROD_COLORS[i]+(isFut?'e0':'bb');
    ctx.beginPath();
    if(ctx.roundRect){ ctx.roundRect(x,by,barW,bH,[3,3,0,0]); }
    else { ctx.rect(x,by,barW,bH); }
    ctx.fill();

    // Value label
    ctx.fillStyle='rgba(255,255,255,0.8)';
    ctx.font='9px DM Mono,monospace';
    ctx.textAlign='center';
    const lbl = _mcView==='prod' ? Math.round(v)+'%' : '€'+Math.round(v);
    ctx.fillText(lbl, x+barW/2, by-4);

    // Delta label (future only)
    if(isFut && refVals){
      const delta=v-refVals[i];
      const sign=delta>=0?'+':'';
      const dlbl=_mcView==='prod' ? sign+delta.toFixed(1)+'%' : sign+'€'+Math.round(delta);
      ctx.fillStyle=delta>=0?'#34d399':'#fb7185';
      ctx.font='8px DM Mono,monospace';
      ctx.fillText(dlbl, x+barW/2, by-16);
    }

    // Product label
    ctx.fillStyle='rgba(255,255,255,0.55)';
    ctx.font='9px DM Mono,monospace';
    ctx.textAlign='center';
    ctx.fillText(PSHORT[i], x+barW/2, PT+plotH+14);

    // Count
    ctx.fillStyle='rgba(255,255,255,0.28)';
    ctx.font='8px DM Mono,monospace';
    const cnt = data.prodCount[i];
    ctx.fillText(cnt>=1000?(cnt/1000).toFixed(1)+'k':cnt, x+barW/2, PT+plotH+26);
  }
}

// ── Diff table ────────────────────────────────────────────────────────────────
function _mcRenderDiff(cur, fut){
  const dTotRev = fut.totalRev.reduce((s,v)=>s+v,0)
                - cur.totalRev.reduce((s,v)=>s+v,0);
  const signT = dTotRev>=0?'+':'−';
  const colT  = dTotRev>=0?'#34d399':'#fb7185';

  const rows = PRODUCTS.map((name,i)=>{
    const dp = (fut.penetration[i]-cur.penetration[i])*100;
    const dr =  fut.revPerCust[i] - cur.revPerCust[i];
    const cp = dp>=0?'#34d399':'#fb7185';
    const cr = dr>=0?'#34d399':'#fb7185';
    return `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
      <span style="width:8px;height:8px;border-radius:2px;background:${PROD_COLORS[i]};flex-shrink:0;display:inline-block"></span>
      <span style="font-size:9px;color:var(--muted2);flex:1;font-family:var(--mono)">${PSHORT[i]}</span>
      <span style="font-size:9px;font-family:var(--mono);color:${cp};width:52px;text-align:right">${dp>=0?'+':''}${dp.toFixed(1)}%</span>
      <span style="font-size:9px;font-family:var(--mono);color:${cr};width:60px;text-align:right">${dr>=0?'+':''}€${Math.abs(dr).toFixed(1)}/cl</span>
    </div>`;
  }).join('');

  document.getElementById('cmod-diff').innerHTML =
    `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
       <span style="font-size:9px;font-family:var(--mono);color:var(--muted);letter-spacing:.08em;text-transform:uppercase">Δ rispetto ad Attuale</span>
       <span style="font-size:11px;font-family:var(--mono);color:${colT};font-weight:500">${signT}€${Math.round(Math.abs(dTotRev)).toLocaleString('it-IT')}/mese totale</span>
     </div>
     <div style="display:flex;gap:4px;font-size:8px;font-family:var(--mono);color:var(--muted);margin-bottom:2px">
       <span style="flex:1"></span>
       <span style="width:52px;text-align:right">Penetr.</span>
       <span style="width:60px;text-align:right">Rev/cliente</span>
     </div>
     ${rows}`;
}

// ── Strategy section ──────────────────────────────────────────────────────────
function _mcRenderStrat(city, custs, cur){
  const n = custs.length;
  if(!n){ document.getElementById('cmod-strat-body').innerHTML=''; return; }

  // Top 3 cross-sell opportunities (low penetration × decent revenue = high score)
  const opps = PRODUCTS.map((name,i)=>({
    i, name, short:PSHORT[i],
    penet: cur.penetration[i],
    avgRev: cur.avgRev[i],
    score: (1-cur.penetration[i]) * (cur.avgRev[i]||1)
  })).sort((a,b)=>b.score-a.score).slice(0,3);

  // Demographics
  const stCnt=[0,0,0];
  let incSum=0, ageSum=0;
  for(const c of custs){ stCnt[c.stato]++; incSum+=c.reddito; ageSum+=c.eta; }
  const avgInc = incSum/n;
  const avgAge = ageSum/n;

  // Revenue summary
  const totalRevNow = cur.totalRev.reduce((s,v)=>s+v,0);
  const revPerCust  = totalRevNow/n;

  // KPI grid
  const kpiHtml = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px">
      <div style="background:var(--s3);border-radius:6px;padding:7px 9px;text-align:center">
        <div style="font-size:15px;font-family:var(--mono);color:var(--accent)">€${Math.round(revPerCust)}</div>
        <div style="font-size:8px;color:var(--muted);margin-top:2px">rev / cliente / mese</div>
      </div>
      <div style="background:var(--s3);border-radius:6px;padding:7px 9px;text-align:center">
        <div style="font-size:15px;font-family:var(--mono);color:var(--accent2)">€${(totalRevNow/1000).toFixed(1)}k</div>
        <div style="font-size:8px;color:var(--muted);margin-top:2px">rev totale / mese</div>
      </div>
      <div style="background:var(--s3);border-radius:6px;padding:7px 9px;text-align:center">
        <div style="font-size:15px;font-family:var(--mono);color:#fbbf24">${Math.round(avgAge)}a · €${Math.round(avgInc/1000)}k</div>
        <div style="font-size:8px;color:var(--muted);margin-top:2px">età · reddito medi</div>
      </div>
    </div>`;

  // Opportunities
  const oppHtml = opps.map(o=>`
    <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
      <span style="width:8px;height:8px;border-radius:2px;background:${PROD_COLORS[o.i]};flex-shrink:0;display:inline-block"></span>
      <span style="font-size:10px;font-family:var(--mono);color:var(--txt);flex:1">${o.name}</span>
      <span style="font-size:9px;font-family:var(--mono);color:var(--muted2)">${Math.round(o.penet*100)}% attuale</span>
      <span style="font-size:9px;font-family:var(--mono);color:#fbbf24;margin-left:6px">€${Math.round(o.avgRev)}/mese</span>
    </div>`).join('');

  // Action plan
  const topOpp  = opps[0];
  const domSt   = ['Single','Coppia','Famiglia'][stCnt.indexOf(Math.max(...stCnt))];
  const actions = [];

  if(topOpp.penet < 0.35){
    const uplift = Math.round(topOpp.avgRev * n * Math.max(0, 0.35-topOpp.penet));
    actions.push(`Campagna attivazione <strong>${topOpp.name}</strong> — segmento dominante ${domSt} — potenziale uplift ~€${uplift.toLocaleString('it-IT')}/mese`);
  }
  if(avgInc > 33000 && cur.penetration[3] < 0.2){
    actions.push(`Reddito medio €${Math.round(avgInc/1000)}k: target <strong>Mutuo</strong> su fascia alta — penetrazione attuale solo ${Math.round(cur.penetration[3]*100)}%`);
  }
  if(avgAge < 42 && cur.penetration[5] < 0.3){
    actions.push(`Segmento giovane (età media ${Math.round(avgAge)} anni): alto margine <strong>Ass. Vita</strong> — €${Math.round(cur.avgRev[5]||45)}/mese medio`);
  }
  if(cur.penetration[4] < 0.2 && avgInc > 28000){
    actions.push(`Bassa penetrazione <strong>Investimenti</strong> (${Math.round(cur.penetration[4]*100)}%) su reddito medio buono — prodotto ad alto retention`);
  }
  if(!actions.length){
    actions.push(`Consolidare il portafoglio con cross-sell su <strong>${opps[1]?.name||'prodotti complementari'}</strong>`);
  }

  const actHtml = actions.map(a=>
    `<li style="font-size:10px;color:var(--muted2);font-family:var(--mono);padding:3px 0;line-height:1.55">${a}</li>`
  ).join('');

  document.getElementById('cmod-strat-body').innerHTML =
    kpiHtml +
    `<div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Top opportunità cross-sell</div>` +
    oppHtml +
    `<div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin:10px 0 5px">Piano d'azione</div>
     <ul style="padding-left:14px;margin:0">${actHtml}</ul>
     <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06)">
       <a href="#" onclick="generateReportCrossSell(_mcId);return false;"
          style="display:inline-flex;align-items:center;gap:5px;font-family:var(--mono);font-size:10px;color:var(--accent2);text-decoration:none;opacity:.8;transition:opacity .15s"
          onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='.8'">
         <svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M6 1v7M3 6l3 3 3-3M1 10h10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
         Scarica dettaglio
       </a>
     </div>`;
}

// ── Revenue Waterfall view ────────────────────────────────────────────────────
function _mcRenderWaterfall(custs){
  const canvas = document.getElementById('cmod-canvas');
  const wrap   = document.getElementById('cmod-canvas-wrap');
  if(wrap.clientWidth > 0) canvas.width = wrap.clientWidth;
  canvas.height = 200;

  document.getElementById('cmod-year-btns').style.visibility = 'hidden';

  if(!custs||!custs.length){
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='rgba(255,255,255,0.22)';ctx.font='12px DM Mono,monospace';ctx.textAlign='center';
    ctx.fillText('Nessun cliente nella selezione attuale',canvas.width/2,canvas.height/2);
    document.getElementById('cmod-diff').style.display='none';
    document.getElementById('cmod-strat-body').innerHTML='<p style="color:var(--muted);font-size:11px;padding:10px 0">Nessun dato disponibile.</p>';
    return;
  }

  _buildRevenueCache();

  // Calcola per ogni prodotto: ricavo attuale (ha il prodotto) e potenziale (è eleggibile)
  const actualSum   = new Array(7).fill(0);
  const eligibleSum = new Array(7).fill(0);

  for(const c of custs){
    const rv = CUSTOMER_REVENUES[c.id];
    if(!rv) continue;
    const el = (typeof getEligibleProducts==='function')
      ? getEligibleProducts(c.eta,c.stato,c.reddito)
      : [0,1,2,3,4,5,6];
    for(const i of el){
      eligibleSum[i] += rv[i];
      if(c.pmask & (1<<i)) actualSum[i] += rv[i];
    }
  }

  const totalActual   = Math.round(actualSum.reduce((s,v)=>s+v,0));
  const totalEligible = Math.round(eligibleSum.reduce((s,v)=>s+v,0));
  const totalGap      = totalEligible - totalActual;
  const captureRate   = totalEligible>0 ? Math.round(totalActual/totalEligible*100) : 100;

  // ── Canvas: istogramma catturato vs potenziale per prodotto ──────
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const W=canvas.width, H=canvas.height;
  const PL=48, PR=12, PT=26, PB=52;
  const plotW=W-PL-PR, plotH=H-PT-PB;
  const bGap=4;
  const bW=Math.floor((plotW-bGap*6)/7);
  const maxVal=Math.max(...eligibleSum,1);

  // Linee griglia (4 livelli)
  for(let j=1;j<=4;j++){
    const y=PT+plotH-j/4*plotH;
    ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(PL,y);ctx.lineTo(W-PR,y);ctx.stroke();
    const lbl=maxVal/1000>=1?'€'+(maxVal/4*j/1000).toFixed(0)+'k':'€'+Math.round(maxVal/4*j);
    ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='8px DM Mono,monospace';ctx.textAlign='right';
    ctx.fillText(lbl,PL-4,y+3);
  }

  PRODUCTS.forEach((name,i)=>{
    const x    = PL + i*(bW+bGap);
    const elH  = eligibleSum[i]>0 ? Math.max(2,eligibleSum[i]/maxVal*plotH) : 0;
    const actH = actualSum[i]>0   ? Math.max(1,actualSum[i]/maxVal*plotH)   : 0;
    const col  = PROD_COLORS[i];

    // Barra ghost (potenziale eleggibile)
    const elY=PT+plotH-elH;
    ctx.fillStyle='rgba(255,255,255,0.07)';
    ctx.fillRect(x,elY,bW,elH);
    ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=1;
    ctx.strokeRect(x,elY,bW,elH);

    // Barra colorata (effettivamente catturato)
    const actY=PT+plotH-actH;
    ctx.fillStyle=col+'99';
    ctx.fillRect(x,actY,bW,actH);
    ctx.fillStyle=col;
    ctx.fillRect(x,actY,bW,2); // linea top

    // Gap label in rosso sopra la barra ghost
    const gap=eligibleSum[i]-actualSum[i];
    if(gap>0){
      const gapLbl=gap>=1000?'-€'+(gap/1000).toFixed(0)+'k':'-€'+Math.round(gap);
      ctx.fillStyle='#fb7185';ctx.font='8px DM Mono,monospace';ctx.textAlign='center';
      ctx.fillText(gapLbl,x+bW/2,elY-4);
    }

    // Label prodotto
    ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='8px DM Mono,monospace';ctx.textAlign='center';
    ctx.fillText(PSHORT[i],x+bW/2,H-PB+13);

    // Tasso cattura %
    const cr=eligibleSum[i]>0?Math.round(actualSum[i]/eligibleSum[i]*100):100;
    ctx.fillStyle=cr>=80?'#34d399':cr>=50?'#fbbf24':'#fb7185';
    ctx.font='7px DM Mono,monospace';
    ctx.fillText(cr+'%',x+bW/2,H-PB+24);
  });

  // Legenda
  ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='8px DM Mono,monospace';ctx.textAlign='left';
  ctx.fillStyle='rgba(255,255,255,0.07)';ctx.fillRect(PL,H-8,12,5);
  ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=0.8;ctx.strokeRect(PL,H-8,12,5);
  ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='7px DM Mono,monospace';
  ctx.fillText('potenziale',PL+15,H-4);
  ctx.fillStyle='#4f8ef799';ctx.fillRect(PL+75,H-8,12,5);
  ctx.fillStyle='rgba(255,255,255,0.35)';
  ctx.fillText('catturato',PL+90,H-4);

  // ── KPI nel blocco diff ──────────────────────────────────────────
  const fmtK=v=>v>=1000?'€'+(v/1000).toFixed(1)+'k/mese':'€'+v+'/mese';
  document.getElementById('cmod-diff').style.display='';
  document.getElementById('cmod-diff').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:4px 0">
      <div style="text-align:center">
        <div style="font-family:var(--mono);font-size:12px;color:#22d3c8">${fmtK(totalActual)}</div>
        <div style="font-size:8px;color:var(--muted);margin-top:2px">catturati</div>
      </div>
      <div style="text-align:center">
        <div style="font-family:var(--mono);font-size:12px;color:var(--muted2)">${fmtK(totalEligible)}</div>
        <div style="font-size:8px;color:var(--muted);margin-top:2px">potenziale</div>
      </div>
      <div style="text-align:center">
        <div style="font-family:var(--mono);font-size:12px;color:#fb7185">${fmtK(totalGap)}</div>
        <div style="font-size:8px;color:var(--muted);margin-top:2px">gap</div>
      </div>
      <div style="text-align:center">
        <div style="font-family:var(--mono);font-size:12px;color:${captureRate>=75?'#34d399':captureRate>=50?'#fbbf24':'#fb7185'}">${captureRate}%</div>
        <div style="font-size:8px;color:var(--muted);margin-top:2px">cattura</div>
      </div>
    </div>`;

  // ── Strategia: top 3 prodotti per gap ────────────────────────────
  const prodGaps = PRODUCTS.map((name,i)=>({i,name,gap:Math.round(eligibleSum[i]-actualSum[i]),
    eligible:Math.round(eligibleSum[i]),actual:Math.round(actualSum[i]),
    captureRate:eligibleSum[i]>0?Math.round(actualSum[i]/eligibleSum[i]*100):100}))
    .filter(p=>p.gap>0).sort((a,b)=>b.gap-a.gap);

  const fmtKS=v=>v>=1000?'€'+(v/1000).toFixed(1)+'k':'€'+v;
  document.getElementById('cmod-strat-body').innerHTML = prodGaps.length===0
    ? '<p style="color:var(--muted);font-size:11px;padding:10px 0">Nessun gap significativo rilevato — ottima copertura.</p>'
    : `<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:9px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase">Top opportunità per prodotto</span>
          <span style="font-family:var(--mono);font-size:9px;color:#22d3c8">gap totale ${fmtKS(totalGap)}/mese</span>
        </div>
        ${prodGaps.slice(0,3).map(p=>`
        <div style="background:var(--s3);border-radius:6px;padding:8px 10px;margin-bottom:6px;border:1px solid rgba(34,211,200,.12)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:10px;font-family:var(--mono);color:var(--txt)">${p.name}</span>
            <span style="font-family:var(--mono);font-size:10px;color:#fb7185">${fmtKS(p.gap)}/mese gap</span>
          </div>
          <div style="height:3px;background:var(--s2);border-radius:2px;overflow:hidden;margin-bottom:4px">
            <div style="height:100%;width:${p.captureRate}%;background:#22d3c8;border-radius:2px"></div>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="font-family:var(--mono);font-size:8px;color:var(--muted2)">${p.captureRate}% già catturato</span>
            <span style="font-family:var(--mono);font-size:8px;color:var(--muted2)">${fmtKS(p.actual)} / ${fmtKS(p.eligible)}</span>
          </div>
        </div>`).join('')}
      </div>`;
}

// ── Churn Risk view ───────────────────────────────────────────────────────────
function _mcRenderChurn(custs){
  const canvas = document.getElementById('cmod-canvas');
  const wrap   = document.getElementById('cmod-canvas-wrap');
  if(wrap.clientWidth > 0) canvas.width = wrap.clientWidth;
  canvas.height = 200;

  document.getElementById('cmod-diff').style.display = 'none';
  // Anno non applicabile a churn: nascondi year-btns
  document.getElementById('cmod-year-btns').style.visibility = 'hidden';

  if(!custs||!custs.length){
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='rgba(255,255,255,0.22)';ctx.font='12px DM Mono,monospace';ctx.textAlign='center';
    ctx.fillText('Nessun cliente nella selezione attuale',canvas.width/2,canvas.height/2);
    document.getElementById('cmod-strat-body').innerHTML='<p style="color:var(--muted);font-size:11px;padding:10px 0">Nessun dato disponibile.</p>';
    return;
  }

  // Calcola score per ogni cliente
  const scored = custs.map(c=>({
    ...c,
    score: (typeof computeChurnScore==='function')
      ? computeChurnScore(c.id,c.eta,c.stato,c.reddito,c.pmask,_mcId)
      : 0
  })).sort((a,b)=>b.score-a.score);

  const n      = scored.length;
  const hiRisk = scored.filter(c=>c.score>=60).length;
  const medRisk= scored.filter(c=>c.score>=30&&c.score<60).length;
  const loRisk = scored.filter(c=>c.score<30).length;
  const avgScr = Math.round(scored.reduce((s,c)=>s+c.score,0)/n);

  // Canvas: istogramma a 4 fasce di rischio
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const W=canvas.width, H=canvas.height;
  const PL=48,PR=12,PT=26,PB=52;
  const plotW=W-PL-PR, plotH=H-PT-PB;
  const bands=[
    {label:'0–29',color:'#34d399',count:loRisk},
    {label:'30–59',color:'#fbbf24',count:medRisk},
    {label:'60–79',color:'#f97316',count:scored.filter(c=>c.score>=60&&c.score<80).length},
    {label:'80–100',color:'#fb7185',count:scored.filter(c=>c.score>=80).length},
  ];
  const maxBand=Math.max(...bands.map(b=>b.count),1);
  const bGap=4;
  const bW=Math.floor((plotW-bGap*(bands.length-1))/bands.length);

  // Linee griglia
  for(let j=0;j<=4;j++){
    const y=PT+plotH-j/4*plotH;
    ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(PL,y);ctx.lineTo(W-PR,y);ctx.stroke();
    if(j>0){
      ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='9px DM Mono,monospace';ctx.textAlign='right';
      ctx.fillText(Math.round(j/4*maxBand),PL-4,y+3);
    }
  }

  bands.forEach((b,i)=>{
    const x=PL+i*(bW+bGap);
    const bH=maxBand>0?Math.max(2,b.count/maxBand*plotH):0;
    const by=PT+plotH-bH;
    ctx.fillStyle=b.color+'33';ctx.fillRect(x,by,bW,bH);
    ctx.strokeStyle=b.color;ctx.lineWidth=1.5;ctx.strokeRect(x,by,bW,bH);
    // Count label
    ctx.fillStyle='rgba(255,255,255,0.85)';ctx.font='10px DM Mono,monospace';ctx.textAlign='center';
    if(b.count>0) ctx.fillText(b.count,x+bW/2,by-8);
    // Band label
    ctx.fillStyle='rgba(255,255,255,0.45)';ctx.font='9px DM Mono,monospace';
    ctx.fillText(b.label,x+bW/2,H-PB+14);
    // Pct label
    const pct=Math.round(b.count/n*100);
    ctx.fillStyle=b.color;ctx.font='8px DM Mono,monospace';
    ctx.fillText(pct+'%',x+bW/2,H-PB+26);
  });

  // Titolo asse X
  ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='8px DM Mono,monospace';ctx.textAlign='center';
  ctx.fillText('Score rischio abbandono',W/2,H-2);

  // Strategia churn nel blocco strat
  const top5=scored.slice(0,5);
  const reasonFreq={};
  for(const c of scored){
    const reasons=(typeof _churnReasons==='function')?_churnReasons(c.id,c.reddito,c.pmask,_mcId):[];
    for(const r of reasons) reasonFreq[r]=(reasonFreq[r]||0)+1;
  }
  const topReasons=Object.entries(reasonFreq).sort((a,b)=>b[1]-a[1]).slice(0,3);

  const rischioBadge=s=>{
    const cls=s>=60?'risk-hi':s>=30?'risk-med':'risk-lo';
    return `<span class="risk-badge ${cls}">${s}</span>`;
  };

  document.getElementById('cmod-strat-body').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:14px">
      <div style="background:rgba(251,113,133,.08);border:1px solid rgba(251,113,133,.25);border-radius:7px;padding:8px;text-align:center">
        <div style="font-family:var(--mono);font-size:18px;color:#fb7185">${hiRisk}</div>
        <div style="font-size:8px;color:var(--muted);margin-top:2px">alto rischio</div>
      </div>
      <div style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:7px;padding:8px;text-align:center">
        <div style="font-family:var(--mono);font-size:18px;color:#fbbf24">${medRisk}</div>
        <div style="font-size:8px;color:var(--muted);margin-top:2px">medio rischio</div>
      </div>
      <div style="background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.25);border-radius:7px;padding:8px;text-align:center">
        <div style="font-family:var(--mono);font-size:18px;color:#34d399">${loRisk}</div>
        <div style="font-size:8px;color:var(--muted);margin-top:2px">basso rischio</div>
      </div>
    </div>
    ${topReasons.length?`<div style="font-size:9px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">Fattori di rischio principali</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px">
      ${topReasons.map(([r,cnt])=>`<span style="font-family:var(--mono);font-size:9px;padding:2px 8px;border-radius:12px;background:rgba(251,113,133,.1);border:1px solid rgba(251,113,133,.25);color:#fb7185">${r} (${cnt})</span>`).join('')}
    </div>`:''}
    <div style="font-size:9px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">Top 5 clienti a rischio</div>
    ${top5.map(c=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
      <span style="font-family:var(--mono);font-size:10px;color:var(--muted2)">#${c.id} \xb7 ${STATUS_LABELS[c.stato]} \xb7 ${c.eta}a</span>
      ${rischioBadge(c.score)}
    </div>`).join('')}
  `;
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.getElementById('cmod-close').addEventListener('click', closeCityModal);
document.getElementById('cmod-overlay').addEventListener('click', function(e){
  if(e.target===this) closeCityModal();
});
document.addEventListener('keydown', function(e){
  if(e.key==='Escape' && _mcId!==null) closeCityModal();
});
document.querySelectorAll('#cmod-view-btns .cmod-ctrl-btn').forEach(b=>{
  b.addEventListener('click',()=>_setCMView(b.dataset.view));
});
document.querySelectorAll('#cmod-year-btns .cmod-ctrl-btn').forEach(b=>{
  b.addEventListener('click',()=>_setCMYear(+b.dataset.year));
});
document.getElementById('cmod-strat-toggle').addEventListener('click', _toggleCMStrategy);
document.getElementById('cmod-strat-hd').addEventListener('click', function(e){
  if(e.target.id!=='cmod-strat-toggle') _toggleCMStrategy();
});
