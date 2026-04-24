// ui/panel.js
// Dipendenze: globals (F, CUSTOMERS, CITIES, PRODUCTS, PSHORT, STATUS_LABELS,
//             STATUS_COLORS, REG_COLORS, cityAgg, selectedCityId, expandedCityId,
//             citySort, citySortDir, regFilter, citySearch, custSort, custSortDir,
//             custSearch, aiCities, aiCustomers, aiCityMeta, lastAiResult),
//             ui/map.js (renderMarkers, showCityView, showCustomers)
// Funzioni: aggregate(), getCityCustomers(cityId), renderCustomerList(),
//           renderCityList(), update(), fmtInc(v), checkReset(),
//           renderAiPanel(data), closeAiPanel(), applyActions(acts, aiResultData)

// Stato filtro mail: mostra solo clienti con proposta di invio
let mailFilterActive = false;

// ── Satisfaction popup ────────────────────────────────────────────────────────
let _satPopup = null;

// SVG path bodies per prodotto (viewBox 0 0 24 24, stroke-based, no fill)
const _PROD_ICONS = [
  // 0 Conto Corrente — edificio banca
  '<path d="M3 22h18"/><path d="M6 18V9"/><path d="M18 18V9"/><path d="M2 11l10-7 10 7"/><path d="M10 22v-4h4v4"/>',
  // 1 Carta Debito — card con chip
  '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><rect x="6" y="13" width="4" height="3" rx="1"/>',
  // 2 Carta Credito — card con onde contactless
  '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><path d="M15 14a2 2 0 0 0 0-3"/><path d="M17.5 16.5a5 5 0 0 0 0-8"/>',
  // 3 Mutuo — casa
  '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  // 4 Investimenti — trend crescente
  '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  // 5 Ass. Vita — scudo con cuore
  '<path d="M12 22s-8-4-8-10V5l8-3 8 3v7c0 6-8 10-8 10z"/><path d="M12 12c-.5-.6-1.5-.8-2-.4-.8.5-.9 1.6-.3 2.3.3.4 2.3 1.8 2.3 1.8s2-1.4 2.3-1.8c.6-.7.5-1.8-.3-2.3-.5-.4-1.5-.2-2 .4z"/>',
  // 6 Ass. Casa — casa con scudo
  '<path d="M3 9l9-7 9 7v5"/><path d="M12 22s-5-3-5-7.5V12l5-2 5 2v2.5c0 4.5-5 7.5-5 7.5z"/>',
];

// ── Aggregation: city stats ───────────────────────────────────────────────────
function aggregate(){
  const {ageMin,ageMax,incomeMin,incomeMax,statuses,products}=F;
  const acc={};
  for(const [,cid,eta,stato,red,pmask] of CUSTOMERS){
    if(eta<ageMin||eta>ageMax) continue;
    if(red<incomeMin||red>incomeMax) continue;
    if(statuses.length>0&&!statuses.includes(stato)) continue;
    if(products.length>0&&!products.every(p=>pmask&(1<<p))) continue;
    if(!acc[cid]){acc[cid]={count:0,income:0,age:0,statuses:[0,0,0],products:new Array(7).fill(0)};}
    const a=acc[cid]; a.count++;a.income+=red;a.age+=eta;a.statuses[stato]++;
    for(let i=0;i<7;i++) if(pmask&(1<<i)) a.products[i]++;
  }
  cityAgg={};
  for(const c of CITIES){
    const a=acc[c.id];
    if(!a||!a.count) continue;
    cityAgg[c.id]={...c,count:a.count,avgIncome:Math.round(a.income/a.count),avgAge:Math.round(a.age/a.count),statuses:a.statuses,products:a.products,penetration:a.products.map(v=>Math.round(v/a.count*100))};
  }
}

// ── Get filtered customers for a city ────────────────────────────────────────
function getCityCustomers(cityId){
  const {ageMin,ageMax,incomeMin,incomeMax,statuses,products}=F;
  const result=[];
  for(const [id,cid,eta,stato,reddito,pmask] of CUSTOMERS){
    if(cid!==cityId) continue;
    if(eta<ageMin||eta>ageMax) continue;
    if(reddito<incomeMin||reddito>incomeMax) continue;
    if(statuses.length>0&&!statuses.includes(stato)) continue;
    if(products.length>0&&!products.every(p=>pmask&(1<<p))) continue;
    result.push({id,eta,stato,reddito,pmask});
  }
  return result;
}
// ── Customer list renderer ────────────────────────────────────────────────────
function renderCustomerList(){
  if(!selectedCityId) return;
  const city=cityAgg[selectedCityId];
  if(!city){showCityView();return;}

  let custs;
  // In analysis mode crosssell: usa solo i candidati AI per questa città,
  // poi applica i filtri sidebar sopra di essi.
  // In analysis mode churn: usa i candidati a rischio per questa città
  if(analysisMode&&analysisResults&&analysisResults.type==='churn'&&
     analysisResults.result&&analysisResults.result.byCityId){
    const churnCity=analysisResults.result.byCityId[selectedCityId];
    if(churnCity){
      const{ageMin,ageMax,incomeMin,incomeMax,statuses,products}=F;
      custs=churnCity.custs.filter(c=>{
        if(c.eta<ageMin||c.eta>ageMax) return false;
        if(c.reddito<incomeMin||c.reddito>incomeMax) return false;
        if(statuses.length>0&&!statuses.includes(c.stato)) return false;
        if(products.length>0&&!products.every(p=>c.pmask&(1<<p))) return false;
        return true;
      });
    }else{
      custs=getCityCustomers(selectedCityId);
    }
  }else if(analysisMode&&analysisResults&&analysisResults.type==='crosssell'&&
     analysisResults.result&&analysisResults.result.byCityId){
    const aiCands=analysisResults.result.byCityId[selectedCityId]||[];
    // Deduplicazione per ID cliente (un cliente può apparire per più prodotti: teniamo la correlazione più alta)
    const byId=new Map();
    for(const c of aiCands){
      if(!byId.has(c.id)||c.correlation>byId.get(c.id).correlation) byId.set(c.id,c);
    }
    // Applica filtri sidebar
    const {ageMin,ageMax,incomeMin,incomeMax,statuses,products}=F;
    custs=[];
    for(const c of byId.values()){
      if(c.eta<ageMin||c.eta>ageMax) continue;
      if(c.reddito<incomeMin||c.reddito>incomeMax) continue;
      if(statuses.length>0&&!statuses.includes(c.stato)) continue;
      if(products.length>0&&!products.every(p=>c.pmask&(1<<p))) continue;
      custs.push(c);
    }
  }else{
    custs=getCityCustomers(selectedCityId);
  }

  // Search by ID
  const q=custSearch.trim();
  if(q) custs=custs.filter(c=>String(c.id).includes(q));

  // ── Mail filter button ────────────────────────────────────────────
  const _aiSetMF = aiCustomers.get(selectedCityId)||new Map();
  const _mailN = custs.filter(c=>{const d=_aiSetMF.get(c.id);return d&&d.suggest&&d.suggest.length;}).length;
  const _mfBtn = document.getElementById('mail-filter-btn');
  if(_mfBtn){
    if(_mailN > 0){
      _mfBtn.style.display='';
      _mfBtn.innerHTML='\u2709 '+_mailN;
      _mfBtn.style.background=mailFilterActive?'rgba(167,139,250,.15)':'transparent';
      _mfBtn.style.borderColor=mailFilterActive?'#a78bfa':'var(--border)';
      _mfBtn.style.color=mailFilterActive?'#a78bfa':'var(--muted)';
    } else {
      _mfBtn.style.display='none';
      mailFilterActive=false;
    }
  }
  if(mailFilterActive) custs=custs.filter(c=>{const d=_aiSetMF.get(c.id);return d&&d.suggest&&d.suggest.length;});

  // Sort
  custs.sort((a,b)=>{
    let d=0;
    if(custSort==='eta') d=a.eta-b.eta;
    else if(custSort==='reddito') d=a.reddito-b.reddito;
    else d=a.id-b.id;
    return custSortDir==='desc'?-d:d;
  });

  const n=custs.length;
  const avgInc=n?Math.round(custs.reduce((s,c)=>s+c.reddito,0)/n):0;
  const avgAge=n?Math.round(custs.reduce((s,c)=>s+c.eta,0)/n):0;
  const nSingle=custs.filter(c=>c.stato===0).length;
  const avgProds=n?parseFloat((custs.reduce((s,c)=>{let cnt=0;for(let i=0;i<7;i++) if(c.pmask&(1<<i)) cnt++;return s+cnt;},0)/n).toFixed(1)):0;

  document.getElementById('cust-count').textContent=n.toLocaleString('it-IT');
  document.getElementById('ckpi-income').textContent='€'+(avgInc/1000).toFixed(1)+'k';
  document.getElementById('ckpi-age').textContent=avgAge+' a';
  document.getElementById('ckpi-single').textContent=n?Math.round(nSingle/n*100)+'%':'—';
  document.getElementById('ckpi-products').textContent=avgProds;
  document.getElementById('cust-count-line').textContent=n.toLocaleString('it-IT')+' clienti';
  document.getElementById('cust-sort-label').textContent=(custSortDir==='desc'?'↓ ':'↑ ')+CUST_SORT.find(f=>f.k===custSort)?.l;

  const list=document.getElementById('cust-list');
  if(n===0){list.innerHTML='<div style="text-align:center;padding:40px 0;color:var(--muted);font-family:var(--mono);font-size:12px">Nessun cliente</div>';return;}

  // Render rows — virtual slice for performance (max 200 visible at once)
  const _aiSet=aiCustomers.get(selectedCityId)||new Map();
  const SLICE=200;
  const visible=custs.slice(0,SLICE);
  list.innerHTML='';

  visible.forEach(c=>{
    const statusColor=STATUS_COLORS[c.stato]||'#64748b';
    const prods=[];
    for(let i=0;i<7;i++) if(c.pmask&(1<<i)) prods.push(i);
    const prodChips=prods.map(i=>`<span class="chip prod">${PSHORT[i]}</span>`).join('');
    const _aiD=_aiSet.get(c.id);
    const aiChips=_aiD&&_aiD.suggest?_aiD.suggest.map(i=>`<span class="chip ai-chip" title="${_aiD.reason}">✦ ${PSHORT[i]}</span>`).join(''):'';
    // Badge churn score se siamo in modalità churn
    const _churnScore=_aiD&&_aiD.churnScore!=null?_aiD.churnScore:(
      (analysisMode&&analysisResults&&analysisResults.type==='churn'&&c.score!=null)?c.score:null);
    const _churnBadge=_churnScore!=null
      ?`<span class="risk-badge ${_churnScore>=60?'risk-hi':_churnScore>=30?'risk-med':'risk-lo'}" title="${(_aiD&&_aiD.reasons||c.reasons||[]).join(', ')}">${_churnScore}</span>`
      :'';

    const _hasSat=typeof CUST_SATISFACTION!=='undefined'&&Array.isArray(CUST_SATISFACTION[c.id])&&CUST_SATISFACTION[c.id].length>0;
    const _satAvgVal=_hasSat?_satAvg(c.id):null;
    const _mailLowSat=_satAvgVal!==null&&_satAvgVal<65;
    const _mailC=_mailLowSat?'#f97316':'#a78bfa';
    const _mailBg=_mailLowSat?'rgba(249,115,22,0.15)':'rgba(167,139,250,0.15)';
    const _mailBtn=(_aiD&&_aiD.suggest&&_aiD.suggest.length)
      ?`<button onclick="event.stopPropagation();sendMail(${c.id},${_aiD.suggest[0]},${Math.round(_aiD.correlation*100)})"
          style="padding:2px 7px;font-size:9px;font-family:var(--mono);background:transparent;border:1px solid ${_mailC};color:${_mailC};border-radius:4px;cursor:pointer;transition:all .15s;margin-top:5px;display:block;width:100%;text-align:center"
          onmouseenter="this.style.background='${_mailBg}'"
          onmouseleave="this.style.background='transparent'">\u2709 Invia</button>`:'';

    const _bubSvg=`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${_hasSat?'#22d3c8':'var(--muted2)'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    const _satIconEl=_hasSat
      ?`<div style="margin-top:6px;opacity:0.72;cursor:pointer;transition:opacity .15s" title="Feedback soddisfazione · ${_satAvgVal}%" onclick="event.stopPropagation();openSatPopup(${c.id})" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.72">${_bubSvg}</div>`
      :`<div style="margin-top:6px;opacity:0.28">${_bubSvg}</div>`;
    const row=document.createElement('div');
    row.className='cust-row'+(_aiD?' ai-cust':'');
    row.innerHTML=`
      <div class="cust-id">#${c.id}</div>
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
          <span style="font-size:11px;font-weight:500;font-family:var(--mono);color:var(--txt)">${c.eta} <span style="font-size:9px;color:var(--muted2)">anni</span></span>
          <span class="chip status" style="border-color:${statusColor}33;color:${statusColor}">${STATUS_LABELS[c.stato]}</span>
        </div>
        <div style="font-size:10px;color:var(--muted2);margin-bottom:3px">Reddito <span style="font-family:var(--mono);color:var(--txt)">€${c.reddito.toLocaleString('it-IT')}</span></div>
        <div class="cust-chips">${prodChips}${aiChips}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        ${_churnBadge}
        <div style="width:7px;height:7px;border-radius:50%;background:${statusColor};margin-left:auto;margin-bottom:4px;margin-top:${_churnBadge?'4px':'0'}"></div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--muted2)">${prods.length} prod</div>
        ${_satIconEl}
        ${_mailBtn}
      </div>
    `;
    list.appendChild(row);
  });

  if(custs.length>SLICE){
    const more=document.createElement('div');
    more.style.cssText='text-align:center;padding:12px 0;font-family:var(--mono);font-size:9px;color:var(--muted);letter-spacing:.08em';
    more.textContent=`+ ${(custs.length-SLICE).toLocaleString('it-IT')} altri (usa i filtri per restringere)`;
    list.appendChild(more);
  }
}

// ── City list renderer ────────────────────────────────────────────────────────
function renderCityList(){
  if(analysisMode){renderAnalysisPanel();return;}
  let rows=Object.values(cityAgg);
  if(regFilter!=='Tutte') rows=rows.filter(c=>c.reg===regFilter);
  const q=citySearch.trim();
  if(q) rows=rows.filter(c=>c.name.toLowerCase().includes(q.toLowerCase()));
  rows.sort((a,b)=>{const d=(a[citySort]||0)-(b[citySort]||0);return citySortDir==='desc'?-d:d;});

  const total=rows.reduce((s,c)=>s+c.count,0);
  const maxC=Math.max(...rows.map(c=>c.count),1);
  const avgInc=rows.length?Math.round(rows.reduce((s,c)=>s+c.avgIncome,0)/rows.length):0;
  const avgAge=rows.length?Math.round(rows.reduce((s,c)=>s+c.avgAge,0)/rows.length):0;

  document.getElementById('kpi-total').textContent=total.toLocaleString('it-IT');
  document.getElementById('kpi-cities').textContent=rows.length;
  document.getElementById('kpi-income').textContent='€'+(avgInc/1000).toFixed(1)+'k';
  document.getElementById('kpi-age').textContent=avgAge+' a';
  document.getElementById('count-line').textContent=`${rows.length} città · ${total.toLocaleString('it-IT')} clienti`;
  document.getElementById('sort-label').textContent=(citySortDir==='desc'?'↓ ':'↑ ')+CITY_SORT.find(f=>f.k===citySort)?.l;

  const list=document.getElementById('city-list');
  if(rows.length===0){list.innerHTML='<div style="text-align:center;padding:40px 0;color:var(--muted);font-family:var(--mono);font-size:12px">Nessun risultato</div>';return;}
  list.innerHTML='';

  rows.forEach((city,idx)=>{
    const color=aiCities.has(city.id)?'#a78bfa':(REG_COLORS[city.reg]||'#4f8ef7');
    const barW=(city.count/maxC*100).toFixed(1);
    const isExp=expandedCityId===city.id;
    const isSel=selectedCityId===city.id;

    const metrics=[
      {l:'Reddito',v:'€'+(city.avgIncome/1000).toFixed(0)+'k',hi:citySort==='avgIncome'},
      {l:'Età',v:city.avgAge+' a',hi:citySort==='avgAge'},
      {l:'Q.Vita',v:city.qi?.toFixed(0),hi:citySort==='qi'},
      {l:'Digital',v:city.di?.toFixed(0),hi:citySort==='di'},
    ];

    let detailHtml='';
    if(isExp){
      const stTotal=city.statuses.reduce((s,v)=>s+v,0)||1;
      const stBars=city.statuses.map((v,i)=>v>0?`<div style="flex:${v};background:${STATUS_COLORS[i]};border-radius:2px;min-width:2px" title="${STATUS_LABELS[i]} ${Math.round(v/stTotal*100)}%"></div>`:'').join('');
      const stLeg=city.statuses.map((v,i)=>v>0?`<span style="font-size:9px;color:var(--muted2);display:flex;align-items:center;gap:3px"><span style="width:5px;height:5px;border-radius:50%;background:${STATUS_COLORS[i]};display:inline-block"></span>${STATUS_LABELS[i]} ${Math.round(v/stTotal*100)}%</span>`:'').join('');
      const prodPills=city.penetration.map((pct,i)=>`<div title="${PRODUCTS[i]}: ${pct}%" style="padding:2px 5px;border-radius:3px;font-size:8px;background:rgba(79,142,247,${(0.1+pct/100*0.8).toFixed(2)});color:${pct>50?'#dde4f0':'var(--muted2)'};font-family:var(--mono);border:1px solid rgba(79,142,247,0.15)">${PSHORT[i]} ${pct}%</div>`).join('');
      detailHtml=`<div style="margin-top:11px;padding-top:11px;border-top:1px solid var(--border);animation:fadeIn .2s ease">
        <div style="font-size:9px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px">Stato civile</div>
        <div style="display:flex;height:5px;border-radius:3px;overflow:hidden;gap:1px;margin-bottom:4px">${stBars}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">${stLeg}</div>
        <div style="font-size:9px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px">Penetrazione prodotti</div>
        <div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:10px">${prodPills}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr">
          ${[['Costo vita',city.cl?.toFixed(1)],['Reddito mercato','€'+city.rm?.toLocaleString('it-IT')],['% single',Math.round(city.statuses[0]/city.count*100)+'%'],['% famiglie',Math.round(city.statuses[2]/city.count*100)+'%']].map(([l,v])=>`<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted2);padding:3px 0;border-bottom:1px solid var(--border)"><span>${l}</span><span style="font-family:var(--mono);color:var(--txt)">${v}</span></div>`).join('')}
        </div>
        ${(()=>{
          if(typeof getCityWaterfall!=='function') return '';
          const wf=getCityWaterfall(city.id);
          if(!wf||!wf.totalEligible) return '';
          const fmtK=v=>v>=1000?'€'+(v/1000).toFixed(1)+'k':'€'+v;
          return `<div style="margin-top:10px;padding:7px 9px;background:rgba(34,211,200,.05);border:1px solid rgba(34,211,200,.15);border-radius:6px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
              <span style="font-size:8px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase">Gap ricavi</span>
              <span style="font-family:var(--mono);font-size:10px;color:#22d3c8">${fmtK(wf.totalGap)}/mese</span>
            </div>
            <div style="height:4px;background:var(--s3);border-radius:2px;overflow:hidden;margin-bottom:4px">
              <div style="height:100%;width:${wf.captureRate}%;background:#22d3c8;border-radius:2px;transition:width .4s"></div>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span style="font-family:var(--mono);font-size:8px;color:var(--muted2)">${wf.captureRate}% catturato</span>
              <span style="font-family:var(--mono);font-size:8px;color:var(--muted2)">${fmtK(wf.totalActual)} / ${fmtK(wf.totalEligible)}</span>
            </div>
          </div>`;
        })()}
        <button onclick="event.stopPropagation();analysisMode=false;showCustomers(${city.id})" style="margin-top:10px;width:100%;padding:6px;font-family:var(--mono);font-size:10px;background:rgba(79,142,247,.1);border:1px solid rgba(79,142,247,.3);color:var(--accent);border-radius:6px;cursor:pointer;transition:all .15s;letter-spacing:.04em" onmouseenter="this.style.background='rgba(79,142,247,.2)'" onmouseleave="this.style.background='rgba(79,142,247,.1)'">
          Vedi ${city.count.toLocaleString('it-IT')} clienti →
        </button>
      </div>`;
    }

    const card=document.createElement('div');
    card.className='city-card'+(isExp?' expanded':'')+(isSel?' selected-city':'')+(aiCities.has(city.id)?' ai-city':'');
    card.dataset.cityId=city.id;
    card.innerHTML=`
      <div style="display:flex;align-items:center;gap:9px">
        <div style="width:22px;height:22px;border-radius:6px;background:var(--s3);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:9px;color:var(--muted);flex-shrink:0">${idx+1}</div>
        <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:baseline;gap:7px;margin-bottom:2px">
            <span style="font-size:13px;font-weight:500;letter-spacing:-.01em">${city.name}</span>
            <span style="font-size:9px;color:var(--muted2)">${city.reg}</span>
          </div>
          <div style="height:3px;background:var(--s3);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${barW}%;background:${color};transition:width .5s;border-radius:2px"></div>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:3px">
          <button onclick="event.stopPropagation();if(typeof openCityModal==='function') openCityModal(${city.id})" title="Analisi dettagliata"
            style="background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:4px;padding:1px 5px;font-size:9px;font-family:var(--mono);cursor:pointer;transition:all .12s;line-height:1.4"
            onmouseenter="this.style.borderColor='rgba(34,211,200,.4)';this.style.color='var(--accent2)'"
            onmouseleave="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">⊞</button>
          <div style="font-family:var(--mono);font-size:15px;color:var(--accent2);line-height:1">${city.count.toLocaleString('it-IT')}</div>
          <div style="font-size:8px;color:var(--muted)">clienti</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:8px">
        ${metrics.map(m=>`<div style="background:${m.hi?'rgba(34,211,200,0.08)':'var(--s3)'};border:1px solid ${m.hi?'rgba(34,211,200,0.25)':'transparent'};border-radius:6px;padding:4px 6px"><div style="font-family:var(--mono);font-size:11px;color:${m.hi?'var(--accent2)':'var(--txt)'};line-height:1;margin-bottom:1px">${m.v}</div><div style="font-size:8px;color:var(--muted)">${m.l}</div></div>`).join('')}
      </div>
      ${detailHtml}
    `;

    // Single click = expand/collapse detail; the "Vedi clienti" button inside handles navigation
    card.addEventListener('click', e => {
      if(e.target.tagName==='BUTTON') return;
      expandedCityId = expandedCityId===city.id ? null : city.id;
      selectedCityId = expandedCityId ? city.id : null;
      renderMarkers();
      renderCityList();
    });

    list.appendChild(card);
  });
}

// ── Master update ─────────────────────────────────────────────────────────────
function update(){
  aggregate();
  renderMarkers();
  if(document.getElementById('view-customers').style.display!=='none'){
    if(selectedCityId && cityAgg[selectedCityId]) renderCustomerList();
    else showCityView();
  } else {
    renderCityList();
  }
}
// ── Controls ──────────────────────────────────────────────────────────────────
function fmtInc(v){return v>=1000?'€'+(v/1000).toFixed(0)+'k':'€'+v;}
function checkReset(){
  const has=F.statuses.length>0||F.products.length>0||F.ageMin>18||F.ageMax<79||F.incomeMin>8000||F.incomeMax<77000;
  document.getElementById('reset-btn').style.display=has?'block':'none';
}
// ── Pannello risultati AI nel pannello destro ─────────────────────
function renderAiPanel(data){
  lastAiResult=data;
  const panel=document.getElementById('ai-panel');
  if(!panel) return;
  if(!data){panel.style.display='none';return;}

  const pct=v=>Math.round(v*100);
  let html='';

  if(data.type==='crosssell'&&data.result&&data.result.candidates.length){
    const {candidates,byCityId}=data.result;
    const prodName=data.prodName||'prodotto';
    const avgCorr=Math.round(candidates.reduce((s,c)=>s+c.correlation,0)/candidates.length);
    const topCities=Object.entries(byCityId).sort((a,b)=>b[1].length-a[1].length).slice(0,8);
    html=`<div class="ai-panel-hd">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span style="font-family:var(--mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#a78bfa">\u25c8 Cross-sell ${esc(prodName)}</span>
        <span style="font-family:var(--mono);font-size:9px;color:var(--muted2)">${candidates.length} candidati \xb7 corr. media ${avgCorr}%</span>
      </div>
      <button class="ai-close-btn" onclick="closeAiPanel()">\u2715</button>
    </div><div class="ai-panel-body">`;
    for(const [cityIdStr,custs] of topCities){
      const cid=+cityIdStr;
      const co=cityAgg[cid];
      if(!co) continue;
      const ac=Math.round(custs.reduce((s,c)=>s+c.correlation,0)/custs.length);
      html+=`<div class="ai-cand-row" onclick="showCustomers(${cid})">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:10px;color:var(--txt)">${esc(co.name)}</span>
          <span style="font-family:var(--mono);font-size:9px;color:#a78bfa">${custs.length} cand.</span>
        </div>
        <div style="font-family:var(--mono);font-size:8px;color:var(--muted2)">corr. media ${ac}% \xb7 clicca per vedere \u2192</div>
      </div>`;
    }
    html+='</div>';

  }else if(data.type==='projection'&&data.result){
    const {years,cur,fut,delta,rates,histN}=data.result;
    const pp=v=>(v>=0?'+':'')+Math.round(v*100)+'pp';
    html=`<div class="ai-panel-hd">
      <span style="font-family:var(--mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#a78bfa">\u25c8 Proiezione +${years} anni</span>
      <button class="ai-close-btn" onclick="closeAiPanel()">\u2715</button>
    </div><div class="ai-panel-body">
    <table class="ai-table"><thead><tr><th>Prodotto</th><th>Oggi</th><th>+${years}a</th><th>\u0394</th></tr></thead><tbody>`;
    for(let i=0;i<7;i++){
      const d=delta.prod[i];
      const cls=d>0.005?'ai-pos':d<-0.005?'ai-neg':'';
      html+=`<tr><td>${PRODUCTS[i]}</td><td class="ai-num">${pct(cur.prod[i])}%</td><td class="ai-num ${cls}">${pct(fut.prod[i])}%</td><td class="ai-num ${cls}">${pp(d)}</td></tr>`;
    }
    html+=`</tbody></table>
    <div style="font-family:var(--mono);font-size:8px;color:var(--muted2);padding:5px 0;border-top:1px solid var(--border);margin-top:4px">
      Basato su ${histN.toLocaleString('it-IT')} clienti tracciati (2021\u20132024).<br>
      Tassi annuali: S\u2192C ${((rates.s2c||0)*100).toFixed(1)}% \xb7 C\u2192F ${((rates.c2f||0)*100).toFixed(1)}% \xb7 S\u2192F ${((rates.s2f||0)*100).toFixed(1)}%
    </div></div>`;

  }else if(data.type==='gap'&&data.result){
    const {gaps,segN,ageMin,ageMax}=data.result;
    html=`<div class="ai-panel-hd">
      <span style="font-family:var(--mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#a78bfa">\u25c8 Gap ${ageMin}\u2013${ageMax} anni (${segN.toLocaleString('it-IT')} clienti)</span>
      <button class="ai-close-btn" onclick="closeAiPanel()">\u2715</button>
    </div><div class="ai-panel-body">`;
    for(const g of gaps.slice(0,7)){
      const ps=pct(g.segPct),pg=pct(g.globalPct),isG=g.gap>0.02;
      html+=`<div class="ai-gap-row">
        <div style="display:flex;justify-content:space-between;margin-bottom:2px">
          <span style="font-size:9px;color:${isG?'var(--txt)':'var(--muted2)'}">${esc(g.name)}</span>
          <span style="font-family:var(--mono);font-size:9px;color:${isG?'#fb7185':'var(--muted2)'}">${isG?'\u2212'+pct(g.gap)+'pp':ps+'%'}</span>
        </div>
        <div class="ai-gap-bars">
          <div class="ai-gap-bar-global" style="width:${Math.min(pg,100)}%"></div>
          <div class="ai-gap-bar-seg" style="width:${Math.min(ps,100)}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:7px;color:var(--muted);margin-top:2px">
          <span>media ${pg}%</span><span>fascia ${ps}%</span>
        </div>
      </div>`;
    }
    html+='</div>';

  }else if(data.type==='customer'&&data.result){
    const {customer,opportunities,similarCount}=data.result;
    const city=CITIES.find(c=>c.id===customer.cityId);
    const hasP=[];
    for(let i=0;i<7;i++) if(customer.pmask&(1<<i)) hasP.push(i);
    const _hasSat=typeof CUST_SATISFACTION!=='undefined'&&Array.isArray(CUST_SATISFACTION[customer.id])&&CUST_SATISFACTION[customer.id].length>0;
    const _satAvgAi=_hasSat?_satAvg(customer.id):null;
    const _bubIcon=_hasSat
      ?`<div style="cursor:pointer;opacity:0.72;transition:opacity .15s;flex-shrink:0" title="Feedback soddisfazione · ${_satAvgAi}%" onclick="openSatPopup(${customer.id})" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.72"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22d3c8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>`
      :`<div style="opacity:0.25;flex-shrink:0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>`;
    html=`<div class="ai-panel-hd">
      <span style="font-family:var(--mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#a78bfa">\u25c8 Cliente #${customer.id}</span>
      <button class="ai-close-btn" onclick="closeAiPanel()">\u2715</button>
    </div><div class="ai-panel-body">
    <div style="background:var(--s3);border-radius:7px;padding:8px 10px;margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:11px;color:var(--txt)">${STATUS_LABELS[customer.stato]} \xb7 ${customer.eta} anni</span>
        <span style="font-family:var(--mono);font-size:10px;color:var(--accent2)">\u20ac${(customer.reddito/1000).toFixed(0)}k</span>
      </div>
      <div style="font-family:var(--mono);font-size:9px;color:var(--muted2)">${city?esc(city.name)+' ('+city.reg+')':'citt\u00e0 sconosciuta'}</div>
      <div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:5px">
        ${hasP.map(i=>`<span class="chip prod">${PSHORT[i]}</span>`).join('')}
        ${!hasP.length?'<span style="font-size:9px;color:var(--muted)">nessun prodotto</span>':''}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
        <span style="font-family:var(--mono);font-size:8px;color:var(--muted)">${similarCount} profili simili analizzati</span>
        ${_bubIcon}
      </div>
    </div>`;
    if(opportunities.length){
      html+=`<div style="font-size:9px;color:var(--muted2);margin-bottom:4px;font-family:var(--mono);letter-spacing:.06em;text-transform:uppercase">Opportunit\u00e0 cross-sell:</div>`;
      for(const o of opportunities){
        const pctV=Math.round(o.correlation*100);
        html+=`<div class="ai-opp-row">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:10px;color:var(--txt)">${esc(o.name)}</span>
            <span class="chip ai-chip">${pctV}% corr.</span>
          </div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--muted2);margin-top:2px">${o.withProd}/${o.total} profili simili ce l\u2019hanno</div>
        </div>`;
      }
    }else{
      html+=`<div style="font-size:9px;color:var(--muted2)">Nessuna opportunit\u00e0 rilevante (soglia 20%).</div>`;
    }
    html+='</div>';
  }else if(data.type==='waterfall'&&data.result){
    const{cities,totalActual,totalGap}=data.result;
    const fmtK=v=>v>=1000?'€'+(v/1000).toFixed(1)+'k':'€'+v;
    const top=cities.slice(0,8);
    html=`<div class="ai-panel-hd">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span style="font-family:var(--mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#22d3c8">◈ Revenue Waterfall</span>
        <span style="font-family:var(--mono);font-size:9px;color:var(--muted2)">gap ${fmtK(totalGap)}/mese</span>
      </div>
      <button class="ai-close-btn" onclick="closeAiPanel()">✕</button>
    </div><div class="ai-panel-body">`;
    for(const wf of top){
      const co=cityAgg[wf.cityId];if(!co)continue;
      html+=`<div class="ai-cand-row" onclick="showCustomers(${wf.cityId})">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:10px;color:var(--txt)">${esc(wf.name)}</span>
          <span style="font-family:var(--mono);font-size:10px;color:#22d3c8">${fmtK(wf.gap)}</span>
        </div>
        <div style="font-family:var(--mono);font-size:8px;color:var(--muted2)">${wf.captureRate}% catturato · ${fmtK(wf.actual)}/${fmtK(wf.eligible)}/mese</div>
      </div>`;
    }
    html+='</div>';
  }else if(data.type==='churn'&&data.result){
    const{byCityId,n,avgScore,totalHigh}=data.result;
    const topCities=Object.entries(byCityId).sort((a,b)=>b[1].highRisk-a[1].highRisk).slice(0,8);
    html=`<div class="ai-panel-hd">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span style="font-family:var(--mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#fb7185">⚠ Rischio Abbandono</span>
        <span style="font-family:var(--mono);font-size:9px;color:var(--muted2)">${totalHigh} alto rischio \xb7 score medio ${avgScore}</span>
      </div>
      <button class="ai-close-btn" onclick="closeAiPanel()">✕</button>
    </div><div class="ai-panel-body">`;
    for(const[cidStr,cs] of topCities){
      const cid=+cidStr;
      const co=cityAgg[cid];if(!co) continue;
      const riskColor=cs.avgScore>=60?'#fb7185':cs.avgScore>=45?'#f97316':'#fbbf24';
      html+=`<div class="ai-cand-row" onclick="showCustomers(${cid})">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:10px;color:var(--txt)">${esc(co.name)}</span>
          <span class="risk-badge risk-hi">${cs.highRisk} alto</span>
        </div>
        <div style="font-family:var(--mono);font-size:8px;color:var(--muted2)">score medio ${cs.avgScore}/100 \xb7 ${cs.medRisk} medio</div>
      </div>`;
    }
    html+='</div>';
  }else{
    panel.style.display='none';
    return;
  }

  panel.innerHTML=html;
  panel.style.display='flex';
}

function closeAiPanel(){
  analysisMode=false;
  analysisResults=null;
  selectedAnalysisCity=null;
  lastAiResult=null;
  aiCities.clear();aiCustomers.clear();aiCityMeta.clear();
  const panel=document.getElementById('ai-panel');
  if(panel) panel.style.display='none';
  renderMarkers();
  renderCityList();
}

// ── applyActions v9 ──────────────────────────────────────────────
function applyActions(acts,aiResultData){
  // Assicura che il pannello risultati (view-cities) sia visibile.
  // applyActions può essere chiamato anche mentre l'utente è nella
  // vista clienti (view-customers): in quel caso i risultati AI
  // verrebbero scritti in un elemento nascosto.
  document.getElementById('view-cities').style.display='flex';
  document.getElementById('view-customers').style.display='none';

  // Attiva analysis mode — il pannello destro mostra i risultati AI
  analysisMode=true;
  analysisResults=aiResultData;
  selectedAnalysisCity=null;

  aiCities.clear();aiCustomers.clear();aiCityMeta.clear();
  for(const a of acts){
    if(a.type==='highlight_cities'){
      for(const id of (a.cityIds||[])){
        aiCities.add(+id);
        if(a.meta&&a.meta[id]) aiCityMeta.set(+id,a.meta[id]);
      }
    }else if(a.type==='highlight_customers'){
      const m=new Map();
      for(const c of (a.customers||[]))
        m.set(c.id,{suggest:c.suggest||[],reason:c.reason||'',correlation:c.correlation||0});
      aiCustomers.set(a.cityId,m);
      aiCities.add(a.cityId);
      if(a.cityMeta) aiCityMeta.set(a.cityId,a.cityMeta);
    }else if(a.type==='waterfall_data'){
      // Nessuna struttura aggiuntiva necessaria: i dati sono in analysisResults
    }else if(a.type==='highlight_churn'){
      // Memorizza score churn per ogni cliente, usato per badge nella lista
      const m=new Map();
      for(const c of (a.customers||[]))
        m.set(c.id,{churnScore:c.score,reasons:c.reasons||[]});
      aiCustomers.set(a.cityId,m);
      aiCities.add(a.cityId);
    }else if(a.type==='prediction'){
      // La predizione viene mostrata nel pannello analisi; niente overlay in analysis mode
    }
  }
  // renderMarkers → renderAnalysisMarkers, renderCityList → renderAnalysisPanel
  renderMarkers();
  renderCityList();
  // Porta la lista risultati in cima
  const cityList=document.getElementById('city-list');
  if(cityList) cityList.scrollTop=0;
  // ai-panel è sostituito dal pannello analisi; tenerlo nascosto
  const panel=document.getElementById('ai-panel');
  if(panel) panel.style.display='none';
}

// ── Analysis Panel ────────────────────────────────────────────────────────────
function renderAnalysisPanel(){
  // Nascondi il vecchio ai-panel (sostituito da questo pannello)
  const aiPanel=document.getElementById('ai-panel');
  if(aiPanel) aiPanel.style.display='none';

  const list=document.getElementById('city-list');

  // Se c'è una città selezionata nel dettaglio, mostra quella
  if(selectedAnalysisCity){renderAnalysisCityDetail(selectedAnalysisCity);return;}

  if(!analysisResults){
    list.innerHTML='<div style="text-align:center;padding:40px 0;color:var(--muted);font-family:var(--mono);font-size:12px">Nessun risultato</div>';
    return;
  }

  // Aggiorna KPI con statistiche correnti
  const active=Object.values(cityAgg);
  const totalN=active.reduce((s,c)=>s+c.count,0);
  const avgInc=active.length?Math.round(active.reduce((s,c)=>s+c.avgIncome,0)/active.length):0;
  const avgAge=active.length?Math.round(active.reduce((s,c)=>s+c.avgAge,0)/active.length):0;
  document.getElementById('kpi-total').textContent=totalN.toLocaleString('it-IT');
  document.getElementById('kpi-cities').textContent=active.length;
  document.getElementById('kpi-income').textContent='\u20ac'+(avgInc/1000).toFixed(1)+'k';
  document.getElementById('kpi-age').textContent=avgAge+' a';
  document.getElementById('count-line').textContent='\u25c8 Analisi AI attiva';
  document.getElementById('sort-label').textContent='';

  const type=analysisResults.type;
  const result=analysisResults.result;
  const pct=v=>Math.round(v*100);

  list.innerHTML='';
  list.classList.add('fade-in');
  setTimeout(()=>list.classList.remove('fade-in'),350);

  // Header con tipo e pulsante ✕
  const typeLabels={crosssell:'Cross-sell',projection:'Proiezione',gap:'Gap Prodotti',demographic:'Demografico',customer:'Analisi Cliente',churn:'Rischio Abbandono',waterfall:'Revenue Waterfall'};
  const typeColors={crosssell:'#a78bfa',projection:'#22d3c8',gap:'#fb7185',demographic:'#fbbf24',customer:'#4f8ef7',churn:'#fb7185',waterfall:'#22d3c8'};
  const typLabel=typeLabels[type]||type;
  const typColor=typeColors[type]||'#a78bfa';

  const hd=document.createElement('div');
  hd.style.cssText='padding:9px 13px 8px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,.12);flex-shrink:0';
  hd.innerHTML='<span style="font-family:var(--mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:'+typColor+'">\u25c8 '+esc(typLabel)+'</span>'
    +'<button onclick="closeAiPanel()" style="background:transparent;border:none;color:var(--muted2);cursor:pointer;font-size:14px;padding:2px 5px;line-height:1" onmouseenter="this.style.color=\'#fb7185\'" onmouseleave="this.style.color=\'var(--muted2)\'">\u2715</button>';
  list.appendChild(hd);

  // ── Crosssell ────────────────────────────────────────────────────
  if(type==='crosssell'&&result&&result.candidates){
    const {candidates,byCityId}=result;
    const prodName=analysisResults.prodName||'prodotto';
    const avgCorr=Math.round(candidates.reduce((s,c)=>s+c.correlation,0)/candidates.length);
    const topCities=Object.entries(byCityId).sort((a,b)=>b[1].length-a[1].length);
    const maxCands=topCities.length?topCities[0][1].length:1;

    const summ=document.createElement('div');
    summ.style.cssText='padding:8px 13px;border-bottom:1px solid var(--border);background:rgba(167,139,250,.04)';
    summ.innerHTML='<div style="font-family:var(--mono);font-size:10px;color:var(--txt);margin-bottom:2px"><span style="color:#a78bfa">'+candidates.length.toLocaleString('it-IT')+'</span> candidati per <span style="color:#a78bfa">'+esc(prodName)+'</span></div>'
      +'<div style="font-family:var(--mono);font-size:8px;color:var(--muted2)">Correlazione media '+avgCorr+'% \xb7 Clicca una citt\u00e0 per i clienti</div>';
    list.appendChild(summ);

    for(const [cidStr,custs] of topCities){
      const cid=+cidStr;
      const co=cityAgg[cid];if(!co) continue;
      const ac=Math.round(custs.reduce((s,c)=>s+c.correlation,0)/custs.length);
      const barW=(custs.length/maxCands*100).toFixed(1);
      const isSel=selectedAnalysisCity===cid;
      const row=document.createElement('div');
      row.style.cssText='padding:9px 13px;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;transition:background .12s'+(isSel?';background:rgba(167,139,250,.08);border-left:2px solid #a78bfa':'');
      row.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'
        +'<span style="font-size:11px;font-weight:500;color:var(--txt)">'+esc(co.name)+'</span>'
        +'<span style="font-family:var(--mono);font-size:12px;color:#a78bfa;font-weight:500">'+custs.length+'</span></div>'
        +'<div style="height:2px;background:var(--s3);border-radius:1px;overflow:hidden;margin-bottom:4px">'
        +'<div style="height:100%;width:'+barW+'%;background:#a78bfa;border-radius:1px"></div></div>'
        +'<div style="display:flex;justify-content:space-between">'
        +'<span style="font-family:var(--mono);font-size:8px;color:var(--muted2)">'+esc(co.reg)+'</span>'
        +'<span style="font-family:var(--mono);font-size:8px;color:var(--muted2)">corr. '+ac+'% \xb7 '+custs.length+' cand.</span></div>';
      row.addEventListener('click',()=>{selectedAnalysisCity=cid;renderAnalysisMarkers();showCustomers(cid);});
      row.addEventListener('mouseenter',()=>{if(selectedAnalysisCity!==cid)row.style.background='rgba(255,255,255,.025)';});
      row.addEventListener('mouseleave',()=>{if(selectedAnalysisCity!==cid)row.style.background='';});
      list.appendChild(row);
    }

  // ── Churn Risk ──────────────────────────────────────────────────
  }else if(type==='churn'&&result&&result.byCityId){
    const{byCityId,n,avgScore,totalHigh}=result;
    const topCities=Object.entries(byCityId).sort((a,b)=>b[1].highRisk-a[1].highRisk);
    const maxHigh=topCities.length?topCities[0][1].highRisk:1;

    const summ=document.createElement('div');
    summ.style.cssText='padding:8px 13px;border-bottom:1px solid var(--border);background:rgba(251,113,133,.04)';
    summ.innerHTML='<div style="font-family:var(--mono);font-size:10px;color:var(--txt);margin-bottom:2px">'
      +'<span style="color:#fb7185">'+totalHigh.toLocaleString('it-IT')+'</span> ad alto rischio su '
      +'<span style="color:var(--muted2)">'+n.toLocaleString('it-IT')+'</span> analizzati</div>'
      +'<div style="font-family:var(--mono);font-size:8px;color:var(--muted2)">Score medio '+avgScore+'/100 \xb7 Clicca una città per i clienti</div>';
    list.appendChild(summ);

    for(const[cidStr,cs] of topCities){
      const cid=+cidStr;
      const co=cityAgg[cid];if(!co)continue;
      const barW=(cs.highRisk/maxHigh*100).toFixed(1);
      const riskColor=cs.avgScore>=60?'#fb7185':cs.avgScore>=45?'#f97316':'#fbbf24';
      const isSel=selectedAnalysisCity===cid;
      const row=document.createElement('div');
      row.style.cssText='padding:9px 13px;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;transition:background .12s'+(isSel?';background:rgba(251,113,133,.08);border-left:2px solid #fb7185':'');
      row.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'
        +'<span style="font-size:11px;font-weight:500;color:var(--txt)">'+esc(co.name)+'</span>'
        +'<div style="display:flex;align-items:center;gap:6px">'
        +'<span class="risk-badge risk-hi">'+cs.highRisk+' alto</span>'
        +'<span style="font-family:var(--mono);font-size:9px;color:var(--muted2)">'+cs.avgScore+'/100</span>'
        +'</div></div>'
        +'<div style="height:2px;background:var(--s3);border-radius:1px;overflow:hidden;margin-bottom:4px">'
        +'<div style="height:100%;width:'+barW+'%;background:'+riskColor+';border-radius:1px"></div></div>'
        +'<div style="display:flex;justify-content:space-between">'
        +'<span style="font-family:var(--mono);font-size:8px;color:var(--muted2)">'+esc(co.reg)+'</span>'
        +'<span style="font-family:var(--mono);font-size:8px;color:var(--muted2)">'+cs.medRisk+' medio \xb7 '+cs.count+' totali</span></div>';
      row.addEventListener('click',()=>{selectedAnalysisCity=cid;renderAnalysisMarkers();renderAnalysisPanel();});
      row.addEventListener('mouseenter',()=>{if(selectedAnalysisCity!==cid)row.style.background='rgba(255,255,255,.025)';});
      row.addEventListener('mouseleave',()=>{if(selectedAnalysisCity!==cid)row.style.background='';});
      list.appendChild(row);
    }

  // ── Waterfall ────────────────────────────────────────────────────
  }else if(type==='waterfall'&&result&&result.cities){
    const{cities,totalActual,totalGap}=result;
    const fmtK=v=>v>=1000?'€'+(v/1000).toFixed(1)+'k':'€'+v;
    const maxGap=cities.length?cities[0].gap:1;

    const summ=document.createElement('div');
    summ.style.cssText='padding:8px 13px;border-bottom:1px solid var(--border);background:rgba(34,211,200,.04)';
    summ.innerHTML='<div style="font-family:var(--mono);font-size:10px;color:var(--txt);margin-bottom:2px">'
      +'Gap totale: <span style="color:#22d3c8">'+fmtK(totalGap)+'</span>/mese · catturati: <span style="color:var(--muted2)">'+fmtK(totalActual)+'</span>/mese</div>'
      +'<div style="font-family:var(--mono);font-size:8px;color:var(--muted2)">Prodotti eleggibili non posseduti · clicca una città per il dettaglio</div>';
    list.appendChild(summ);

    for(const wf of cities){
      const co=cityAgg[wf.cityId];if(!co)continue;
      const barW=(wf.gap/maxGap*100).toFixed(1);
      const isSel=selectedAnalysisCity===wf.cityId;
      const row=document.createElement('div');
      row.style.cssText='padding:9px 13px;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;transition:background .12s'+(isSel?';background:rgba(34,211,200,.08);border-left:2px solid #22d3c8':'');
      row.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'
        +'<span style="font-size:11px;font-weight:500;color:var(--txt)">'+esc(wf.name)+'</span>'
        +'<div style="display:flex;align-items:center;gap:6px">'
        +'<span style="font-family:var(--mono);font-size:11px;color:#22d3c8;font-weight:500">'+fmtK(wf.gap)+'</span>'
        +'<span style="font-family:var(--mono);font-size:8px;color:var(--muted2)">gap/mese</span>'
        +'</div></div>'
        +'<div style="height:2px;background:var(--s3);border-radius:1px;overflow:hidden;margin-bottom:4px">'
        +'<div style="height:100%;width:'+barW+'%;background:#22d3c8;border-radius:1px"></div></div>'
        +'<div style="display:flex;justify-content:space-between">'
        +'<span style="font-family:var(--mono);font-size:8px;color:var(--muted2)">'+esc(wf.reg)+'</span>'
        +'<span style="font-family:var(--mono);font-size:8px;color:var(--muted2)">catturato '+wf.captureRate+'% · '+fmtK(wf.actual)+'/'+fmtK(wf.eligible)+'</span></div>';
      row.addEventListener('click',()=>{selectedAnalysisCity=wf.cityId;renderAnalysisMarkers();renderAnalysisPanel();});
      row.addEventListener('mouseenter',()=>{if(selectedAnalysisCity!==wf.cityId)row.style.background='rgba(255,255,255,.025)';});
      row.addEventListener('mouseleave',()=>{if(selectedAnalysisCity!==wf.cityId)row.style.background='';});
      list.appendChild(row);
    }

  // ── Cliente singolo ──────────────────────────────────────────────
  }else if(type==='customer'&&result){
    const {customer,opportunities,similarCount}=result;
    const city=CITIES.find(c=>c.id===customer.cityId);
    const hasP=[];
    for(let i=0;i<7;i++) if(customer.pmask&(1<<i)) hasP.push(i);
    const _hasSatR=typeof CUST_SATISFACTION!=='undefined'&&Array.isArray(CUST_SATISFACTION[customer.id])&&CUST_SATISFACTION[customer.id].length>0;
    const _satAvgR=_hasSatR?_satAvg(customer.id):null;
    const _bubR=_hasSatR
      ?'<div style="cursor:pointer;opacity:0.72;transition:opacity .15s;flex-shrink:0" title="Feedback soddisfazione · '+_satAvgR+'%" onclick="openSatPopup('+customer.id+')" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.72"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22d3c8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>'
      :'<div style="opacity:0.25;flex-shrink:0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>';

    const card=document.createElement('div');
    card.style.cssText='padding:10px 13px;border-bottom:1px solid var(--border)';
    card.innerHTML='<div style="background:var(--s3);border-radius:8px;padding:10px 12px">'
      +'<div style="display:flex;justify-content:space-between;margin-bottom:5px">'
      +'<span style="font-size:12px;color:var(--txt);font-weight:500">'+STATUS_LABELS[customer.stato]+' \xb7 '+customer.eta+' anni</span>'
      +'<span style="font-family:var(--mono);font-size:11px;color:var(--accent2)">\u20ac'+(customer.reddito/1000).toFixed(0)+'k</span></div>'
      +'<div style="font-family:var(--mono);font-size:9px;color:var(--muted2);margin-bottom:7px">'+(city?esc(city.name)+' ('+city.reg+')':'citt\u00e0 sconosciuta')+'</div>'
      +'<div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:5px">'
      +(hasP.length?hasP.map(i=>'<span class="chip prod">'+PSHORT[i]+'</span>').join(''):'<span style="font-size:9px;color:var(--muted)">nessun prodotto</span>')
      +'</div><div style="display:flex;justify-content:space-between;align-items:center">'
      +'<span style="font-family:var(--mono);font-size:8px;color:var(--muted)">'+similarCount+' profili simili analizzati</span>'
      +_bubR
      +'</div></div>'
      +(city?'<button onclick="showCustomers('+city.id+')" style="margin-top:8px;width:100%;padding:6px;font-family:var(--mono);font-size:9px;background:rgba(79,142,247,.1);border:1px solid rgba(79,142,247,.3);color:var(--accent);border-radius:6px;cursor:pointer" onmouseenter="this.style.background=\'rgba(79,142,247,.2)\'" onmouseleave="this.style.background=\'rgba(79,142,247,.1)\'">Vedi clienti di '+esc(city.name)+' \u2192</button>':'');
    list.appendChild(card);

    if(opportunities.length){
      const oppHd=document.createElement('div');
      oppHd.style.cssText='padding:6px 13px 4px;font-family:var(--mono);font-size:8px;color:var(--muted2);letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid var(--border)';
      oppHd.textContent='Opportunit\u00e0 cross-sell';
      list.appendChild(oppHd);
      // Valori fissi del profilo usati come soglie di similarità
      const etaMin=customer.eta-5;
      const etaMax=customer.eta+5;
      const redMin=Math.round(customer.reddito*0.80/1000);
      const redMax=Math.round(customer.reddito*1.20/1000);
      const statoLabel=STATUS_LABELS[customer.stato];
      const oppBody=document.createElement('div');
      oppBody.style.cssText='padding:8px 13px;display:flex;flex-direction:column';
      for(const o of opportunities){
        const pctV=Math.round(o.correlation*100);
        const oBox=document.createElement('div');
        oBox.style.cssText='background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.25);border-radius:8px;padding:10px 12px;margin-bottom:8px';
        oBox.innerHTML=
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
          +'<span style="font-size:12px;font-weight:600;color:#dde4f0;font-family:var(--mono)">'+esc(o.name)+'</span>'
          +'<span style="background:rgba(167,139,250,0.15);border:1px solid #a78bfa;color:#a78bfa;padding:2px 7px;border-radius:10px;font-size:10px;font-family:var(--mono)">\u2736 '+pctV+'% correlazione</span>'
          +'</div>'
          +'<div style="font-size:10px;color:var(--muted2);margin:6px 0;line-height:1.5">Il '+pctV+'% dei clienti con profilo simile ('+esc(statoLabel)+', '+etaMin+'&ndash;'+etaMax+' anni, reddito \u20ac'+redMin+'k\u2013\u20ac'+redMax+'k) possiede gi\u00e0 questo prodotto.</div>'
          +'<div style="text-align:right">'
          +'<button onclick="event.stopPropagation();sendMail('+customer.id+','+o.product+','+pctV+')"'
          +' style="padding:2px 7px;font-size:9px;font-family:var(--mono);background:transparent;border:1px solid '+(_satAvgR!==null&&_satAvgR<65?'#f97316':'#a78bfa')+';color:'+(_satAvgR!==null&&_satAvgR<65?'#f97316':'#a78bfa')+';border-radius:4px;cursor:pointer;transition:all .15s"'
          +' onmouseenter="this.style.background=\''+(_satAvgR!==null&&_satAvgR<65?'rgba(249,115,22,0.15)':'rgba(167,139,250,0.15)')+'\'"'
          +' onmouseleave="this.style.background=\'transparent\'">\u2709 Invia</button>'
          +'</div>';
        oppBody.appendChild(oBox);
      }
      list.appendChild(oppBody);
    }else{
      const noOpp=document.createElement('div');
      noOpp.style.cssText='padding:12px 13px;font-family:var(--mono);font-size:9px;color:var(--muted2)';
      noOpp.textContent='Nessuna opportunit\u00e0 rilevante (soglia 20%).';
      list.appendChild(noOpp);
    }

  // ── Gap prodotti ─────────────────────────────────────────────────
  }else if(type==='gap'&&result){
    const {gaps,segN,ageMin,ageMax}=result;
    const summ=document.createElement('div');
    summ.style.cssText='padding:8px 13px;border-bottom:1px solid var(--border);background:rgba(251,113,133,.04)';
    summ.innerHTML='<div style="font-family:var(--mono);font-size:9px;color:var(--muted2)">Fascia '+ageMin+'\u2013'+ageMax+' anni \xb7 '+segN.toLocaleString('it-IT')+' clienti analizzati</div>';
    list.appendChild(summ);

    for(const g of (gaps||[]).slice(0,7)){
      const ps=pct(g.segPct),pg=pct(g.globalPct),isG=g.gap>0.02;
      const gRow=document.createElement('div');
      gRow.style.cssText='padding:8px 13px;border-bottom:1px solid rgba(255,255,255,.04)';
      gRow.innerHTML='<div style="display:flex;justify-content:space-between;margin-bottom:3px">'
        +'<span style="font-size:10px;color:'+(isG?'var(--txt)':'var(--muted2)')+'">'+esc(g.name)+'</span>'
        +'<span style="font-family:var(--mono);font-size:9px;color:'+(isG?'#fb7185':'var(--muted2)')+'">'+( isG?'-'+pct(g.gap)+'pp':ps+'%')+'</span></div>'
        +'<div style="height:7px;background:var(--s3);border-radius:3px;position:relative;margin:3px 0">'
        +'<div style="height:7px;background:rgba(79,142,247,.35);border-radius:3px;width:'+Math.min(pg,100)+'%"></div>'
        +'<div style="height:4px;background:#a78bfa;border-radius:3px;position:absolute;top:1.5px;left:0;width:'+Math.min(ps,100)+'%"></div></div>'
        +'<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:7px;color:var(--muted)">'
        +'<span>media '+pg+'%</span><span>fascia '+ps+'%</span></div>';
      list.appendChild(gRow);
    }

    if(aiCities.size){
      const note=document.createElement('div');
      note.style.cssText='padding:8px 13px;font-family:var(--mono);font-size:8px;color:var(--muted2);border-top:1px solid var(--border)';
      note.textContent='\u25c8 Clicca una citt\u00e0 evidenziata sulla mappa per il dettaglio';
      list.appendChild(note);
    }

  // ── Proiezione ───────────────────────────────────────────────────
  }else if(type==='projection'&&result){
    const {years,cur,fut,delta,rates,histN}=result;
    const pp=v=>(v>=0?'+':'')+Math.round(v*100)+'pp';
    const summ=document.createElement('div');
    summ.style.cssText='padding:8px 13px;border-bottom:1px solid var(--border);background:rgba(34,211,200,.03)';
    summ.innerHTML='<div style="font-family:var(--mono);font-size:9px;color:var(--muted2)">Proiezione +'+years+' anni \xb7 '+histN.toLocaleString('it-IT')+' clienti tracciati (2021\u20132024)</div>';
    list.appendChild(summ);

    for(let i=0;i<7;i++){
      const d=delta.prod[i];
      const isPos=d>0.005,isNeg=d<-0.005;
      const col=isPos?'#34d399':isNeg?'#fb7185':'var(--muted2)';
      const futPct=pct(fut.prod[i]);
      const pRow=document.createElement('div');
      pRow.style.cssText='padding:8px 13px;border-bottom:1px solid rgba(255,255,255,.04)';
      pRow.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">'
        +'<span style="font-size:10px;color:var(--txt)">'+PRODUCTS[i]+'</span>'
        +'<div style="display:flex;gap:8px;font-family:var(--mono);font-size:9px">'
        +'<span style="color:var(--muted2)">'+pct(cur.prod[i])+'%</span>'
        +'<span style="color:'+col+'">'+futPct+'%</span>'
        +'<span style="color:'+col+'">'+pp(d)+'</span></div></div>'
        +'<div style="height:3px;background:var(--s3);border-radius:2px;overflow:hidden">'
        +'<div style="height:100%;width:'+Math.min(futPct,100)+'%;background:'+col+';opacity:0.6;border-radius:2px"></div></div>';
      list.appendChild(pRow);
    }

    const note=document.createElement('div');
    note.style.cssText='padding:8px 13px;font-family:var(--mono);font-size:8px;color:var(--muted2)';
    note.textContent='Tassi storici: S\u2192C '+((rates.s2c||0)*100).toFixed(1)+'% \xb7 C\u2192F '+((rates.c2f||0)*100).toFixed(1)+'% \xb7 S\u2192F '+((rates.s2f||0)*100).toFixed(1)+'%';
    list.appendChild(note);

  // ── Demografico ──────────────────────────────────────────────────
  }else if(type==='demographic'&&result&&result.g1&&result.g2){
    const {g1,g2,s1,s2}=result;
    const l1=STATUS_LABELS[s1[0]],l2=STATUS_LABELS[s2[0]];

    const summ=document.createElement('div');
    summ.style.cssText='padding:8px 13px;border-bottom:1px solid var(--border);background:rgba(251,191,36,.03)';
    summ.innerHTML='<div style="font-family:var(--mono);font-size:9px;color:var(--muted2)">Confronto '+esc(l1)+' ('+g1.n.toLocaleString('it-IT')+') vs '+esc(l2)+' ('+g2.n.toLocaleString('it-IT')+')</div>';
    list.appendChild(summ);

    const stats=document.createElement('div');
    stats.style.cssText='padding:8px 13px;border-bottom:1px solid var(--border);display:grid;grid-template-columns:1fr 1fr;gap:6px';
    stats.innerHTML='<div style="background:var(--s3);border-radius:6px;padding:7px 9px">'
      +'<div style="font-family:var(--mono);font-size:9px;color:#4f8ef7;margin-bottom:2px">'+esc(l1)+'</div>'
      +'<div style="font-family:var(--mono);font-size:10px;color:var(--txt)">\u20ac'+(g1.avgInc/1000).toFixed(0)+'k \xb7 '+Math.round(g1.avgAge)+'a</div></div>'
      +'<div style="background:var(--s3);border-radius:6px;padding:7px 9px">'
      +'<div style="font-family:var(--mono);font-size:9px;color:#a78bfa;margin-bottom:2px">'+esc(l2)+'</div>'
      +'<div style="font-family:var(--mono);font-size:10px;color:var(--txt)">\u20ac'+(g2.avgInc/1000).toFixed(0)+'k \xb7 '+Math.round(g2.avgAge)+'a</div></div>';
    list.appendChild(stats);

    const prodHd=document.createElement('div');
    prodHd.style.cssText='padding:6px 13px 4px;font-family:var(--mono);font-size:8px;color:var(--muted2);letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid var(--border)';
    prodHd.textContent='Confronto prodotti';
    list.appendChild(prodHd);

    for(let i=0;i<7;i++){
      const p1=pct(g1.pct[i]),p2=pct(g2.pct[i]),d=p2-p1;
      const isS=Math.abs(d)>3;
      const col=d>0?'#34d399':d<0?'#fb7185':'var(--muted2)';
      const pRow=document.createElement('div');
      pRow.style.cssText='padding:6px 13px;border-bottom:1px solid rgba(255,255,255,.04)';
      pRow.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center">'
        +'<span style="font-size:9px;color:'+(isS?'var(--txt)':'var(--muted2)')+'">'+PRODUCTS[i]+'</span>'
        +'<div style="display:flex;gap:8px;font-family:var(--mono);font-size:9px">'
        +'<span style="color:#4f8ef7">'+p1+'%</span>'
        +'<span style="color:#a78bfa">'+p2+'%</span>'
        +'<span style="color:'+col+'">'+(d>=0?'+':'')+d+'pp</span></div></div>';
      list.appendChild(pRow);
    }

  }else{
    const fallback=document.createElement('div');
    fallback.style.cssText='text-align:center;padding:40px 13px;color:var(--muted);font-family:var(--mono);font-size:11px';
    fallback.textContent='Nessun risultato strutturato disponibile.';
    list.appendChild(fallback);
  }
}

// ── Analysis City Detail ──────────────────────────────────────────────────────
function renderAnalysisCityDetail(cityId){
  const list=document.getElementById('city-list');
  const co=cityAgg[cityId];
  if(!co){selectedAnalysisCity=null;renderAnalysisPanel();return;}

  const type=analysisResults&&analysisResults.type;
  const typColor={crosssell:'#a78bfa',projection:'#22d3c8',gap:'#fb7185',demographic:'#fbbf24',customer:'#4f8ef7',churn:'#fb7185',waterfall:'#22d3c8'}[type]||'#a78bfa';

  list.innerHTML='';
  list.classList.add('fade-in');
  setTimeout(()=>list.classList.remove('fade-in'),350);

  // Header con ← Risultati e ✕
  const hd=document.createElement('div');
  hd.style.cssText='padding:8px 13px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between';
  hd.innerHTML='<button onclick="selectedAnalysisCity=null;renderAnalysisMarkers();renderAnalysisPanel();"'
    +' style="background:var(--s2);border:1px solid var(--border2);color:var(--muted2);border-radius:6px;padding:4px 9px;font-family:var(--mono);font-size:9px;cursor:pointer;transition:all .15s"'
    +' onmouseenter="this.style.color=\'var(--accent2)\';this.style.borderColor=\'var(--accent)\'"'
    +' onmouseleave="this.style.color=\'var(--muted2)\';this.style.borderColor=\'var(--border2)\'">← Risultati</button>'
    +'<button onclick="closeAiPanel()" style="background:transparent;border:none;color:var(--muted2);cursor:pointer;font-size:13px;padding:2px 5px;line-height:1"'
    +' onmouseenter="this.style.color=\'#fb7185\'" onmouseleave="this.style.color=\'var(--muted2)\'">✕</button>';
  list.appendChild(hd);

  // Info città
  const cityInfo=document.createElement('div');
  cityInfo.style.cssText='padding:10px 13px;border-bottom:1px solid var(--border)';
  cityInfo.innerHTML='<div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">'
    +'<div style="width:8px;height:8px;border-radius:50%;background:'+typColor+'"></div>'
    +'<span style="font-size:14px;font-weight:500;color:var(--txt)">'+esc(co.name)+'</span>'
    +'<span style="font-family:var(--mono);font-size:9px;color:var(--muted2)">'+esc(co.reg)+'</span></div>'
    +'<div style="font-family:var(--mono);font-size:9px;color:var(--muted2)">'+co.count.toLocaleString('it-IT')+' clienti filtrati</div>';
  list.appendChild(cityInfo);

  // ── Branch waterfall: dettaglio prodotto per prodotto ─────────────
  if(type==='waterfall'){
    const wfData=getCityWaterfall(cityId);
    if(wfData){
      const fmtK=v=>v>=1000?'€'+(v/1000).toFixed(1)+'k':'€'+v;
      const crColor=wfData.captureRate>=70?'#34d399':wfData.captureRate>=50?'#fbbf24':'#fb7185';

      // 4 KPI cards
      const kpiDiv=document.createElement('div');
      kpiDiv.style.cssText='padding:10px 13px;border-bottom:1px solid var(--border)';
      kpiDiv.innerHTML='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px">'
        +[['Catturati',fmtK(wfData.totalActual)+'/mese','#22d3c8'],
          ['Potenziale',fmtK(wfData.totalEligible)+'/mese','var(--txt)'],
          ['Gap',fmtK(wfData.totalGap)+'/mese','#fb7185'],
          ['Tasso cattura',wfData.captureRate+'%',crColor]]
        .map(([l,v,c])=>'<div style="background:var(--s3);border-radius:5px;padding:5px 7px">'
          +'<div style="font-family:var(--mono);font-size:10px;color:'+c+'">'+v+'</div>'
          +'<div style="font-size:8px;color:var(--muted)">'+l+'</div></div>').join('')
        +'</div>';
      list.appendChild(kpiDiv);

      // Barre prodotto per prodotto (ghost=eleggibile, colorato=catturato)
      const maxEl=Math.max(...wfData.products.map(p=>p.eligible),1);
      const prodDiv=document.createElement('div');
      prodDiv.style.cssText='padding:10px 13px;border-bottom:1px solid var(--border)';
      let prodHtml='<div style="font-size:9px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">Prodotto per prodotto</div>';
      for(const p of wfData.products){
        if(!p.eligible) continue;
        const aW=(p.actual/maxEl*100).toFixed(1);
        const eW=(p.eligible/maxEl*100).toFixed(1);
        const cColor=p.captureRate>=70?'#34d399':p.captureRate>=50?'#fbbf24':'#fb7185';
        prodHtml+='<div style="margin-bottom:9px">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">'
          +'<span style="font-family:var(--mono);font-size:9px;color:var(--txt)">'+PSHORT[p.i]+'</span>'
          +'<div style="display:flex;align-items:center;gap:8px">'
          +(p.gap>0?'<span style="font-family:var(--mono);font-size:9px;color:#fb7185">gap '+fmtK(p.gap)+'</span>':'')
          +'<span style="font-family:var(--mono);font-size:9px;color:'+cColor+'">'+p.captureRate+'%</span>'
          +'</div></div>'
          +'<div style="position:relative;height:5px;background:var(--s3);border-radius:3px;overflow:hidden">'
          +'<div style="position:absolute;inset:0;width:'+eW+'%;background:rgba(34,211,200,0.18)"></div>'
          +'<div style="position:absolute;inset:0;width:'+aW+'%;background:#22d3c8;border-radius:3px"></div>'
          +'</div></div>';
      }
      prodDiv.innerHTML=prodHtml;
      list.appendChild(prodDiv);

      // Top 3 opportunità per gap assoluto
      const topOpps=wfData.products.filter(p=>p.gap>0).sort((a,b)=>b.gap-a.gap).slice(0,3);
      if(topOpps.length){
        const oppDiv=document.createElement('div');
        oppDiv.style.cssText='padding:10px 13px;border-bottom:1px solid var(--border)';
        let oppHtml='<div style="font-size:9px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">Top opportunità</div>';
        for(const op of topOpps){
          const missed=op.eligibleN-op.actualN;
          oppHtml+='<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04)">'
            +'<div><div style="font-family:var(--mono);font-size:10px;color:var(--txt)">'+esc(op.name)+'</div>'
            +'<div style="font-family:var(--mono);font-size:8px;color:var(--muted2)">'+missed+' clienti eleggibili senza prodotto</div></div>'
            +'<div style="text-align:right;flex-shrink:0;margin-left:8px">'
            +'<div style="font-family:var(--mono);font-size:11px;color:#22d3c8;font-weight:500">'+fmtK(op.gap)+'</div>'
            +'<div style="font-family:var(--mono);font-size:8px;color:var(--muted2)">/mese</div>'
            +'</div></div>';
        }
        oppDiv.innerHTML=oppHtml;
        list.appendChild(oppDiv);
      }
    }

    // Pulsante clienti (cyan, stile waterfall)
    const wfBtnDiv=document.createElement('div');
    wfBtnDiv.style.cssText='padding:10px 13px';
    wfBtnDiv.innerHTML='<button onclick="showCustomers('+co.id+')" style="width:100%;padding:7px;font-family:var(--mono);font-size:10px;background:rgba(34,211,200,.1);border:1px solid rgba(34,211,200,.3);color:#22d3c8;border-radius:6px;cursor:pointer;transition:all .15s" onmouseenter="this.style.background=\'rgba(34,211,200,.2)\'" onmouseleave="this.style.background=\'rgba(34,211,200,.1)\'">Vedi '+co.count.toLocaleString('it-IT')+' clienti →</button>';
    list.appendChild(wfBtnDiv);
    return;
  }

  // ── Branch churn: dettaglio rischio per città ──────────────────────
  if(type==='churn'){
    const cs=analysisResults&&analysisResults.result&&analysisResults.result.byCityId[cityId];
    if(cs){
      const lowRisk=cs.count-cs.highRisk-cs.medRisk;
      const scColor=cs.avgScore>=60?'#fb7185':cs.avgScore>=30?'#f97316':'#fbbf24';

      // 4 KPI cards
      const chKpiDiv=document.createElement('div');
      chKpiDiv.style.cssText='padding:10px 13px;border-bottom:1px solid var(--border)';
      chKpiDiv.innerHTML='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px">'
        +[['Alto rischio',cs.highRisk,'#fb7185'],
          ['Medio rischio',cs.medRisk,'#f97316'],
          ['Score medio',cs.avgScore+'/100',scColor],
          ['Analizzati',cs.count.toLocaleString('it-IT'),'var(--txt)']]
        .map(([l,v,c])=>'<div style="background:var(--s3);border-radius:5px;padding:5px 7px">'
          +'<div style="font-family:var(--mono);font-size:10px;color:'+c+'">'+v+'</div>'
          +'<div style="font-size:8px;color:var(--muted)">'+l+'</div></div>').join('')
        +'</div>';
      list.appendChild(chKpiDiv);

      // Barra distribuzione rischio a 3 segmenti
      const distDiv=document.createElement('div');
      distDiv.style.cssText='padding:10px 13px;border-bottom:1px solid var(--border)';
      const hP=(cs.highRisk/cs.count*100).toFixed(1);
      const mP=(cs.medRisk/cs.count*100).toFixed(1);
      const lP=(lowRisk/cs.count*100).toFixed(1);
      distDiv.innerHTML='<div style="font-size:9px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">Distribuzione rischio</div>'
        +'<div style="display:flex;height:8px;border-radius:4px;overflow:hidden;gap:1px;margin-bottom:6px">'
        +(cs.highRisk>0?'<div style="flex:'+cs.highRisk+';background:#fb7185"></div>':'')
        +(cs.medRisk>0?'<div style="flex:'+cs.medRisk+';background:#f97316"></div>':'')
        +(lowRisk>0?'<div style="flex:'+lowRisk+';background:#fbbf24"></div>':'')
        +'</div>'
        +'<div style="display:flex;gap:12px">'
        +'<span style="font-family:var(--mono);font-size:8px;color:#fb7185">● '+hP+'% alto</span>'
        +'<span style="font-family:var(--mono);font-size:8px;color:#f97316">● '+mP+'% medio</span>'
        +'<span style="font-family:var(--mono);font-size:8px;color:#fbbf24">● '+lP+'% basso</span>'
        +'</div>';
      list.appendChild(distDiv);

      // Top 5 clienti ad alto rischio
      const top5=cs.custs.slice(0,5);
      if(top5.length){
        const custDiv=document.createElement('div');
        custDiv.style.cssText='padding:10px 13px;border-bottom:1px solid var(--border)';
        let custHtml='<div style="font-size:9px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">Top 5 clienti a rischio</div>';
        for(const c of top5){
          const sc=c.score;
          const sColor=sc>=60?'#fb7185':sc>=30?'#f97316':'#fbbf24';
          const sBg=sc>=60?'rgba(251,113,133,.12)':sc>=30?'rgba(249,115,22,.12)':'rgba(251,191,36,.12)';
          custHtml+='<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)">'
            +'<div><div style="font-family:var(--mono);font-size:9px;color:var(--txt)">#'+c.id+' \xb7 '+esc(STATUS_LABELS[c.stato])+' \xb7 '+c.eta+' a</div>'
            +'<div style="font-family:var(--mono);font-size:8px;color:var(--muted2);margin-top:2px">'+c.reasons.join(' \xb7 ')+'</div></div>'
            +'<div style="flex-shrink:0;margin-left:8px;padding:2px 6px;border-radius:10px;background:'+sBg+';border:1px solid '+sColor+';font-family:var(--mono);font-size:9px;font-weight:500;color:'+sColor+'">'+sc+'</div>'
            +'</div>';
        }
        custDiv.innerHTML=custHtml;
        list.appendChild(custDiv);
      }

      // Fattori di rischio aggregati sui clienti ad alto rischio
      const highCusts=cs.custs.filter(c=>c.score>=60);
      if(highCusts.length){
        const factorMap={};
        for(const c of highCusts) for(const r of c.reasons) factorMap[r]=(factorMap[r]||0)+1;
        const factors=Object.entries(factorMap).sort((a,b)=>b[1]-a[1]);
        const chFactDiv=document.createElement('div');
        chFactDiv.style.cssText='padding:10px 13px;border-bottom:1px solid var(--border)';
        let factHtml='<div style="font-size:9px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">Fattori di rischio (alto rischio)</div>';
        const maxF=factors[0]?factors[0][1]:1;
        for(const[reason,cnt] of factors){
          const pct=Math.round(cnt/highCusts.length*100);
          const w=(cnt/maxF*100).toFixed(1);
          factHtml+='<div style="margin-bottom:7px">'
            +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">'
            +'<span style="font-family:var(--mono);font-size:9px;color:var(--txt)">'+esc(reason)+'</span>'
            +'<span style="font-family:var(--mono);font-size:9px;color:#fb7185">'+pct+'%</span>'
            +'</div>'
            +'<div style="height:3px;background:var(--s3);border-radius:2px;overflow:hidden">'
            +'<div style="height:100%;width:'+w+'%;background:rgba(251,113,133,0.55);border-radius:2px"></div>'
            +'</div></div>';
        }
        chFactDiv.innerHTML=factHtml;
        list.appendChild(chFactDiv);
      }
    }

    // Pulsante clienti (red, stile churn)
    const chBtnDiv=document.createElement('div');
    chBtnDiv.style.cssText='padding:10px 13px';
    chBtnDiv.innerHTML='<button onclick="showCustomers('+co.id+')" style="width:100%;padding:7px;font-family:var(--mono);font-size:10px;background:rgba(251,113,133,.1);border:1px solid rgba(251,113,133,.3);color:#fb7185;border-radius:6px;cursor:pointer;transition:all .15s" onmouseenter="this.style.background=\'rgba(251,113,133,.2)\'" onmouseleave="this.style.background=\'rgba(251,113,133,.1)\'">Vedi '+co.count.toLocaleString('it-IT')+' clienti →</button>';
    list.appendChild(chBtnDiv);
    return;
  }

  // Statistiche città: stato civile, KPI, penetrazione prodotti
  const stBars=co.statuses.map((v,i)=>v>0?'<div style="flex:'+v+';background:'+STATUS_COLORS[i]+';border-radius:2px;min-width:2px"></div>':'').join('');
  const det=document.createElement('div');
  det.style.cssText='padding:10px 13px;border-bottom:1px solid var(--border)';
  det.innerHTML='<div style="display:flex;height:5px;border-radius:3px;overflow:hidden;gap:1px;margin-bottom:8px">'+stBars+'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;margin-bottom:10px">'
    +[['Reddito medio','\u20ac'+(co.avgIncome/1000).toFixed(1)+'k'],['Et\u00e0 media',co.avgAge+' a'],['Q.Vita',(co.qi!=null?co.qi.toFixed(0):'—')],['Digital',(co.di!=null?co.di.toFixed(0):'—')]]
      .map(([l,v])=>'<div style="background:var(--s3);border-radius:5px;padding:5px 7px"><div style="font-family:var(--mono);font-size:11px;color:var(--accent2)">'+v+'</div><div style="font-size:8px;color:var(--muted)">'+l+'</div></div>').join('')
    +'</div>'
    +'<div style="font-size:9px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:5px">Penetrazione prodotti</div>'
    +'<div style="display:flex;gap:3px;flex-wrap:wrap">'
    +co.penetration.map((p,i)=>'<div style="padding:2px 5px;border-radius:3px;font-size:8px;background:rgba(79,142,247,'+(0.1+p/100*0.8).toFixed(2)+');color:'+(p>50?'#dde4f0':'var(--muted2)')+';font-family:var(--mono)">'+PSHORT[i]+' '+p+'%</div>').join('')
    +'</div>';
  list.appendChild(det);

  // Bottone Vedi clienti
  const btnDiv=document.createElement('div');
  btnDiv.style.cssText='padding:10px 13px';
  btnDiv.innerHTML='<button onclick="showCustomers('+co.id+')" style="width:100%;padding:7px;font-family:var(--mono);font-size:10px;background:rgba(79,142,247,.1);border:1px solid rgba(79,142,247,.3);color:var(--accent);border-radius:6px;cursor:pointer;transition:all .15s" onmouseenter="this.style.background=\'rgba(79,142,247,.2)\'" onmouseleave="this.style.background=\'rgba(79,142,247,.1)\'">Vedi '+co.count.toLocaleString('it-IT')+' clienti \u2192</button>';
  list.appendChild(btnDiv);
}

// ── Satisfaction popup functions ──────────────────────────────────────────────

function _satCol(pct){ return pct>=70?'#34d399':pct>=55?'#fbbf24':'#fb7185'; }
function _satAvg(cid){
  const recs=typeof CUST_SATISFACTION!=='undefined'?CUST_SATISFACTION[cid]:null;
  if(!recs||!recs.length) return null;
  return Math.round(recs.reduce((s,r)=>s+r[1],0)/recs.length);
}

function openSatPopup(cid){
  if(typeof CUST_SATISFACTION==='undefined') return;
  const satData=CUST_SATISFACTION[cid];
  if(!satData||!satData.length) return;

  // Lazy-init DOM overlay
  if(!_satPopup){
    _satPopup=document.createElement('div');
    _satPopup.style.cssText='position:fixed;inset:0;z-index:8500;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box';
    const bd=document.createElement('div');
    bd.style.cssText='position:absolute;inset:0;background:rgba(0,0,0,0.62)';
    bd.onclick=closeSatPopup;
    _satPopup.appendChild(bd);
    const inner=document.createElement('div');
    inner.id='_sat-inner';
    inner.style.cssText='position:relative;z-index:1;width:308px;max-height:82vh;overflow-y:auto;background:rgba(8,13,24,0.98);border:1px solid rgba(79,142,247,0.28);border-radius:13px;box-shadow:0 8px 40px rgba(0,0,0,0.75);scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.06) transparent';
    _satPopup.appendChild(inner);
    document.body.appendChild(_satPopup);
  }

  // Dati cliente
  const cust=CUSTOMERS.find(function(c){return c[0]===cid;});
  if(!cust) return;
  const id=cust[0],cityId=cust[1],eta=cust[2],stato=cust[3];
  const city=(CITIES||[]).find(function(c){return c.id===cityId;})||{name:'\u2014',reg:'\u2014'};

  const inner=document.getElementById('_sat-inner');

  // Icona volto + fumetto
  const faceIco='<svg width="32" height="32" viewBox="0 0 38 38" fill="none">'
    +'<circle cx="13" cy="15" r="6" stroke="#4f8ef7" stroke-width="1.5" fill="rgba(79,142,247,0.12)"/>'
    +'<circle cx="11" cy="14" r=".9" fill="#4f8ef7"/><circle cx="15" cy="14" r=".9" fill="#4f8ef7"/>'
    +'<path d="M10.5 17.5c.8 1.3 4.2 1.3 5 0" stroke="#4f8ef7" stroke-width="1" stroke-linecap="round" fill="none"/>'
    +'<path d="M7 26c0-3.3 2.7-6 6-6s6 2.7 6 4" stroke="#4f8ef7" stroke-width="1.5" stroke-linecap="round" fill="none"/>'
    +'<rect x="20" y="7" width="16" height="12" rx="2.5" stroke="#22d3c8" stroke-width="1.5" fill="rgba(34,211,200,0.09)"/>'
    +'<path d="M22 19l-2 5.5 4.5-2.5" stroke="#22d3c8" stroke-width="1.5" stroke-linejoin="round" fill="rgba(34,211,200,0.09)"/>'
    +'<line x1="23" y1="11" x2="33" y2="11" stroke="#22d3c8" stroke-width="1.2" stroke-linecap="round" opacity=".65"/>'
    +'<line x1="23" y1="15" x2="30" y2="15" stroke="#22d3c8" stroke-width="1.2" stroke-linecap="round" opacity=".65"/>'
    +'</svg>';

  inner.innerHTML='<div style="padding:13px 13px 10px;display:flex;align-items:center;gap:9px;border-bottom:1px solid var(--border)">'
    +faceIco
    +'<div style="flex:1;min-width:0">'
    +'<div style="font-family:var(--mono);font-size:14px;font-weight:500;color:var(--txt)">Cliente #'+id+'</div>'
    +'<div style="font-size:10px;color:var(--muted2);margin-top:2px">'+eta+' anni \u00b7 '+STATUS_LABELS[stato]+' \u00b7 '+city.name+' \u00b7 '+city.reg+'</div>'
    +'</div>'
    +'<button onclick="closeSatPopup()" style="background:none;border:none;color:var(--muted);font-size:17px;cursor:pointer;padding:2px 6px;line-height:1;border-radius:4px;flex-shrink:0" onmouseenter="this.style.color=\'var(--txt)\'" onmouseleave="this.style.color=\'var(--muted)\'">&#x2715;</button>'
    +'</div>'
    +'<div style="padding:10px 10px 9px;display:flex;flex-wrap:wrap;gap:7px" id="_sat-grid"></div>'
    +'<div id="_sat-det" style="overflow:hidden;max-height:0;transition:max-height .32s ease,opacity .28s ease;opacity:0"></div>';

  // Bottoni prodotto
  const grid=inner.querySelector('#_sat-grid');
  satData.forEach(function(item,idx){
    const pIdx=item[0],sat=item[1];
    const pcol=PROD_COLORS[pIdx];
    const scol=_satCol(sat);
    const btn=document.createElement('button');
    btn.onclick=function(e){e.stopPropagation();_selectSatProd(satData,idx,btn);};
    btn.style.cssText='display:flex;flex-direction:column;align-items:center;gap:4px;width:80px;padding:9px 5px 8px;background:var(--s2);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:all .18s;font-family:var(--mono)';
    btn.innerHTML='<div style="font-size:8px;color:var(--muted2);text-align:center;line-height:1.3;height:20px;display:flex;align-items:center;justify-content:center">'+PSHORT[pIdx]+'</div>'
      +'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="'+pcol+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.75">'+_PROD_ICONS[pIdx]+'</svg>'
      +'<div style="font-size:11px;font-weight:500;color:'+scol+'">'+sat+'%</div>';
    grid.appendChild(btn);
  });

  _satPopup.style.display='flex';
}

function _selectSatProd(satData,idx,btnEl){
  const item=satData[idx];
  const pIdx=item[0],sat=item[1];
  const mot=(typeof CSAT_MOT!=='undefined')?CSAT_MOT[item[2]]:(item[2]||'');
  const con=(typeof CSAT_CON!=='undefined')?CSAT_CON[item[3]]:(item[3]||'');
  const pcol=PROD_COLORS[pIdx];

  // Evidenzia pulsante attivo
  const grid=document.getElementById('_sat-grid');
  if(grid) grid.querySelectorAll('button').forEach(function(b){b.style.background='var(--s2)';b.style.borderColor='var(--border)';b.style.boxShadow='none';b.style.transform='none';});
  btnEl.style.background=pcol+'2e';
  btnEl.style.borderColor=pcol;
  btnEl.style.boxShadow='0 0 0 1px '+pcol+'55, 0 0 10px '+pcol+'22';
  btnEl.style.transform='translateY(-1px)';

  // Sezione dettaglio — slide-in
  const det=document.getElementById('_sat-det');
  if(!det) return;
  det.innerHTML='<div style="border-top:1px solid var(--border);padding:12px 14px 16px">'
    +'<div style="font-size:9px;font-family:var(--mono);letter-spacing:.09em;color:var(--accent2);margin-bottom:7px;text-transform:uppercase">Feedback</div>'
    +'<div style="font-size:11px;color:var(--txt);line-height:1.65">'+mot+'</div>'
    +'<div style="font-size:9px;font-family:var(--mono);letter-spacing:.09em;color:var(--accent);margin-top:13px;margin-bottom:7px;text-transform:uppercase">Consigli</div>'
    +'<div style="font-size:11px;color:var(--txt);line-height:1.65">'+con+'</div>'
    +'</div>';
  det.style.maxHeight='520px';
  det.style.opacity='1';
  setTimeout(function(){det.scrollIntoView({behavior:'smooth',block:'nearest'});},60);
}

function closeSatPopup(){
  if(_satPopup) _satPopup.style.display='none';
}

// ── Mail filter toggle ────────────────────────────────────────────────────────
(function(){
  const btn=document.getElementById('mail-filter-btn');
  if(!btn) return;
  btn.addEventListener('click',function(){
    mailFilterActive=!mailFilterActive;
    renderCustomerList();
  });
})();
