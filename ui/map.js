// ui/map.js
// Dipendenze: globals (CITIES, REG_COLORS, STATUS_COLORS, PSHORT, leafletMap,
//             markerLayer, aiCities, aiCityMeta, selectedCityId, expandedCityId, cityAgg)
// Funzioni: initMap(), renderMarkers(), showCityView(), showCustomers(cityId)

// Bounding box Italia (incluse Sardegna e Sicilia)
const ITALY_BOUNDS=[[35.2,6.6],[47.1,18.8]];

// ── Leaflet ───────────────────────────────────────────────────────────────────
function initMap(){
  leafletMap=L.map('map',{zoomControl:true,attributionControl:true});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',maxZoom:14
  }).addTo(leafletMap);
  markerLayer=L.layerGroup().addTo(leafletMap);
  leafletMap.fitBounds(ITALY_BOUNDS,{padding:[18,18]});
  leafletMap.on('click',()=>{
    selectedCityId=null;
    expandedCityId=null;
    renderMarkers();
    renderCityList();
  });
  // Ridimensionamento finestra → adatta sempre l'Italia al container
  let _resizeTimer;
  window.addEventListener('resize',()=>{
    clearTimeout(_resizeTimer);
    _resizeTimer=setTimeout(fitItaly,120);
  });
}

function fitItaly(){
  if(!leafletMap) return;
  // Leaflet emette 'resize' solo dopo aver aggiornato _size internamente.
  // fitBounds viene eseguito DENTRO quell'evento: usa le dimensioni corrette
  // e calcola lo zoom proporzionale al container effettivo.
  leafletMap.once('resize',()=>{
    leafletMap.fitBounds(ITALY_BOUNDS,{padding:[18,18]});
  });
  leafletMap.invalidateSize({animate:false});
}

function renderMarkers(){
  if(analysisMode){renderAnalysisMarkers();return;}
  markerLayer.clearLayers();
  const active=Object.values(cityAgg);
  const maxC=Math.max(...active.map(c=>c.count),1);
  const total=active.reduce((s,c)=>s+c.count,0);
  document.getElementById('map-overlay').textContent=`${active.length} città · ${total.toLocaleString('it-IT')} clienti`;
  document.getElementById('total-n').textContent=total.toLocaleString('it-IT');
  document.getElementById('city-n').textContent=`su ${active.length} città`;

  const _aiMaxC=aiCityMeta.size?Math.max(...[...aiCityMeta.values()].map(m=>m.candidates||0)):1;
  for(const city of active){
    const frac=city.count/maxC;
    const _aiMeta=aiCityMeta.get(city.id);
    const _rBoost=_aiMeta?Math.min(Math.round((_aiMeta.candidates||0)/_aiMaxC*8),8):0;
    const r=10+frac*28+_rBoost;
    const color=aiCities.has(city.id)?'#a78bfa':(REG_COLORS[city.reg]||'#4f8ef7');
    const isSel=selectedCityId===city.id;
    const circle=L.circleMarker([city.lat,city.lng],{
      radius:r,fillColor:color,fillOpacity:isSel?0.92:0.65,
      color:isSel?'#ffffff':color,weight:isSel?2.5:1,opacity:0.9
    });
    const lbl=city.count>=1000?(city.count/1000).toFixed(1)+'k':city.count;
    L.marker([city.lat,city.lng],{icon:L.divIcon({className:'',html:`<div style="font-family:'DM Mono',monospace;font-size:10px;font-weight:500;color:rgba(255,255,255,0.95);pointer-events:none;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,0.9);transform:translateX(-50%)">${lbl}</div>`,iconAnchor:[0,0]}),interactive:false,zIndexOffset:1000}).addTo(markerLayer);

    const stTotal=city.statuses.reduce((s,v)=>s+v,0)||1;
    const stBars=city.statuses.map((v,i)=>v>0?`<span style="display:inline-block;width:${Math.round(v/stTotal*60)}px;height:4px;background:${STATUS_COLORS[i]};border-radius:2px;margin-right:2px"></span>`:'').join('');
    const prodPills=city.penetration.slice(0,4).map((pct,i)=>`<span style="font-size:9px;font-family:'DM Mono',monospace;padding:1px 4px;border-radius:3px;background:rgba(79,142,247,${(0.15+pct/100*0.7).toFixed(2)});color:#dde4f0;margin-right:3px">${PSHORT[i]} ${pct}%</span>`).join('');
    circle.bindPopup(`<div style="font-family:'DM Mono',monospace">
      <div style="font-size:13px;color:#22d3c8;margin-bottom:3px;font-weight:500">${city.name}</div>
      <div style="font-size:9px;color:#64748b;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px">${city.reg}</div>
      <div style="display:flex;flex-direction:column;gap:3px;margin-bottom:8px">
        ${[['Clienti',city.count.toLocaleString('it-IT')],['Reddito medio','€'+city.avgIncome.toLocaleString('it-IT')],['Età media',city.avgAge+' anni'],['Qualità vita',city.qi]].map(([l,v])=>`<div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b"><span>${l}</span><span style="color:#dde4f0">${v}</span></div>`).join('')}
      </div>
      <div style="font-size:9px;color:#4a5568;margin-bottom:3px;letter-spacing:.08em;text-transform:uppercase">Stato civile</div>
      <div style="margin-bottom:7px">${stBars}</div>
      <div style="font-size:9px;color:#4a5568;margin-bottom:3px;letter-spacing:.08em;text-transform:uppercase">Prodotti</div>
      <div>${prodPills}</div>
      ${_aiMeta?`<div style="margin-top:5px;padding-top:5px;border-top:1px solid rgba(167,139,250,.2);font-family:'DM Mono',monospace;font-size:9px;color:#a78bfa">◈ ${_aiMeta.candidates} candidati · corr. ${_aiMeta.avgCorr||0}%</div>`:''}
    </div>`,{className:'lf-popup',maxWidth:240});

    circle.bindTooltip(city.name,{permanent:false,direction:'top',className:'lf-city-tt',offset:[0,-4]});
    circle.on('click',e=>{
      e.originalEvent.stopPropagation();
      // Always stay on city view — just select + expand the card
      if(document.getElementById('view-customers').style.display!=='none') showCityView();
      selectedCityId=city.id;
      expandedCityId=city.id;
      renderMarkers();
      renderCityList();
      // Scroll the card into view
      setTimeout(()=>{
        const el=document.querySelector(`[data-city-id="${city.id}"]`);
        if(el) el.scrollIntoView({behavior:'smooth',block:'nearest'});
      },60);
    });
    circle.addTo(markerLayer);
  }
}

// ── View switching ────────────────────────────────────────────────────────────
function showCityView(){
  document.getElementById('view-cities').style.display='flex';
  document.getElementById('view-customers').style.display='none';
  selectedCityId=null;
  selectedAnalysisCity=null;
  renderMarkers();
  renderCityList();
}

function showCustomers(cityId){
  const city=cityAgg[cityId];
  if(!city){showCityView();return;}
  selectedCityId=cityId;
  // Reset mail filter on city change
  if(typeof mailFilterActive!=='undefined') mailFilterActive=false;
  document.getElementById('view-cities').style.display='none';
  document.getElementById('view-customers').style.display='flex';
  document.getElementById('cust-city-name').textContent=city.name;
  document.getElementById('cust-city-reg').textContent=city.reg;
  document.getElementById('back-btn').textContent=analysisMode?'← Risultati':'← Città';
  renderCustomerList();
}

// ── Analysis Mode markers ─────────────────────────────────────────────────────
function renderAnalysisMarkers(){
  markerLayer.clearLayers();
  const active=Object.values(cityAgg);
  const total=active.reduce((s,c)=>s+c.count,0);
  document.getElementById('map-overlay').textContent='\u2736 Analisi \xb7 '+active.length+' citt\u00e0';
  document.getElementById('total-n').textContent=total.toLocaleString('it-IT');
  document.getElementById('city-n').textContent='su '+active.length+' citt\u00e0';
  if(!active.length||!analysisResults) return;

  const type=analysisResults.type;
  const maxBase=Math.max(...active.map(c=>c.count),1);

  // ── Cliente singolo: solo il marker bianco della città del cliente ──
  if(type==='customer'){
    const r=analysisResults.result;
    const custCityId=r&&r.customer?r.customer.cityId:null;
    if(!custCityId) return;
    // Usa CITIES direttamente (non cityAgg) per non dipendere dai filtri attivi
    const cityData=CITIES.find(c=>c.id===custCityId);
    if(!cityData) return;
    const cust=r.customer;
    const nOpp=r.opportunities?r.opportunities.length:0;
    const stStr=STATUS_LABELS[cust.stato];
    const circle=L.circleMarker([cityData.lat,cityData.lng],{
      radius:22,fillColor:'#ffffff',fillOpacity:0.92,
      color:'#22d3c8',weight:2.5,opacity:1
    });
    circle.bindPopup(
      '<div style="font-family:\'DM Mono\',monospace">'
      +'<div style="font-size:12px;color:#22d3c8;margin-bottom:3px;font-weight:500">'+esc(cityData.name)+'</div>'
      +'<div style="font-size:10px;color:#dde4f0;margin-bottom:4px">Cliente #'+cust.id+' \xb7 '+stStr+' \xb7 '+cust.eta+'a</div>'
      +'<div style="font-family:\'DM Mono\',monospace;font-size:9px;color:#64748b">'+(nOpp>0?nOpp+' opportunit\u00e0 cross-sell':'nessuna opportunit\u00e0')+'</div>'
      +'</div>',
      {className:'lf-popup',maxWidth:200}
    );
    circle.on('click',e=>{
      e.originalEvent.stopPropagation();
      document.getElementById('view-cities').style.display='flex';
      document.getElementById('view-customers').style.display='none';
      renderAnalysisPanel();
    });
    circle.addTo(markerLayer);
    return;
  }

  // ── Cross-sell: marker viola dimensionati per numero candidati ──
  if(type==='crosssell'){
    const byCityId=(analysisResults.result&&analysisResults.result.byCityId)||{};
    const maxCands=Math.max(...Object.values(byCityId).map(c=>c.length),1);
    for(const city of active){
      const custs=byCityId[city.id];
      const n=custs?custs.length:0;
      const hasC=n>0;
      const frac=hasC?n/maxCands:0;
      const isSel=selectedAnalysisCity===city.id;
      const circle=L.circleMarker([city.lat,city.lng],{
        radius:(hasC?(10+frac*26):6)+(isSel?3:0),
        fillColor:hasC?'#a78bfa':'rgba(74,85,104,0.25)',fillOpacity:isSel?0.92:hasC?(0.5+frac*0.35):0.1,
        color:isSel?'#ffffff':hasC?'#a78bfa':'rgba(74,85,104,0.15)',
        weight:isSel?2.5:hasC?1:0.4,opacity:hasC?0.9:0.2
      });
      if(hasC){
        const lbl=n>=1000?(n/1000).toFixed(1)+'k':n;
        L.marker([city.lat,city.lng],{icon:L.divIcon({className:'',html:'<div style="font-family:\'DM Mono\',monospace;font-size:10px;font-weight:500;color:rgba(255,255,255,0.95);pointer-events:none;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,0.9);transform:translateX(-50%)">'+lbl+'</div>',iconAnchor:[0,0]}),interactive:false,zIndexOffset:1000}).addTo(markerLayer);
        circle.on('click',e=>{
          e.originalEvent.stopPropagation();
          selectedAnalysisCity=city.id;
          renderAnalysisMarkers();
          showCustomers(city.id);
        });
      }
      circle.addTo(markerLayer);
    }
    return;
  }

  // ── Waterfall: marker cyan dimensionati per gap € ──────────────────────
  if(type==='waterfall'){
    const wfCities=(analysisResults.result&&analysisResults.result.cities)||[];
    const byId={};
    for(const c of wfCities) byId[c.cityId]=c;
    const maxGap=Math.max(...wfCities.map(c=>c.gap),1);
    for(const city of active){
      const wf=byId[city.id];
      const hasC=wf&&wf.gap>0;
      const frac=hasC?wf.gap/maxGap:0;
      const isSel=selectedAnalysisCity===city.id;
      const circle=L.circleMarker([city.lat,city.lng],{
        radius:(hasC?(10+frac*26):6)+(isSel?3:0),
        fillColor:hasC?'#22d3c8':'rgba(74,85,104,0.25)',
        fillOpacity:isSel?0.92:hasC?(0.45+frac*0.4):0.1,
        color:isSel?'#ffffff':hasC?'#22d3c8':'rgba(74,85,104,0.15)',
        weight:isSel?2.5:hasC?1:0.4,opacity:hasC?0.9:0.2
      });
      if(hasC){
        const gapLbl=wf.gap>=1000?'€'+(wf.gap/1000).toFixed(1)+'k':'€'+wf.gap;
        L.marker([city.lat,city.lng],{icon:L.divIcon({className:'',html:'<div style="font-family:\'DM Mono\',monospace;font-size:9px;font-weight:500;color:rgba(255,255,255,0.95);pointer-events:none;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,0.9);white-space:nowrap;transform:translateX(-50%)">'+gapLbl+'</div>',iconSize:[0,0],iconAnchor:[0,0]}),interactive:false,zIndexOffset:1000}).addTo(markerLayer);
        const popupHtml='<div style="font-family:\'DM Mono\',monospace">'
          +'<div style="font-size:13px;color:#22d3c8;margin-bottom:3px;font-weight:500">'+esc(city.name)+'</div>'
          +'<div style="font-size:9px;color:#64748b;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px">'+city.reg+'</div>'
          +'<div style="display:flex;flex-direction:column;gap:3px">'
          +'<div style="display:flex;justify-content:space-between;font-size:10px"><span style="color:#64748b">Catturati</span><span style="color:#22d3c8">€'+(wf.actual/1000).toFixed(1)+'k/mese</span></div>'
          +'<div style="display:flex;justify-content:space-between;font-size:10px"><span style="color:#64748b">Potenziale</span><span style="color:#dde4f0">€'+(wf.eligible/1000).toFixed(1)+'k/mese</span></div>'
          +'<div style="display:flex;justify-content:space-between;font-size:10px"><span style="color:#64748b">Gap</span><span style="color:#fb7185">'+gapLbl+'/mese</span></div>'
          +'<div style="display:flex;justify-content:space-between;font-size:10px"><span style="color:#64748b">Tasso cattura</span><span style="color:#dde4f0">'+wf.captureRate+'%</span></div>'
          +'</div></div>';
        circle.on('mouseover',()=>{
          L.popup({className:'lf-popup',maxWidth:220}).setLatLng([city.lat,city.lng]).setContent(popupHtml).openOn(leafletMap);
        });
        circle.on('mouseout',()=>{ leafletMap.closePopup(); });
        circle.on('click',e=>{
          e.originalEvent.stopPropagation();
          leafletMap.closePopup();
          selectedAnalysisCity=city.id;
          renderAnalysisMarkers();
          renderAnalysisPanel();
        });
      }
      circle.addTo(markerLayer);
    }
    return;
  }

  // ── Churn: marker con gradiente dal giallo al rosso basato su avgScore ──
  if(type==='churn'){
    const byCity=(analysisResults.result&&analysisResults.result.byCityId)||{};
    const maxHigh=Math.max(...Object.values(byCity).map(c=>c.highRisk),1);
    for(const city of active){
      const cs=byCity[city.id];
      const hasC=cs&&cs.highRisk>0;
      const isSel=selectedAnalysisCity===city.id;
      const frac=hasC?cs.highRisk/maxHigh:0;
      // Colore: giallo (#fbbf24) → arancione (#f97316) → rosso (#fb7185) in base ad avgScore
      let fillColor='rgba(74,85,104,0.25)';
      if(hasC){
        const s=cs.avgScore;
        if(s>=60) fillColor='#fb7185';
        else if(s>=45) fillColor='#f97316';
        else fillColor='#fbbf24';
      }
      const circle=L.circleMarker([city.lat,city.lng],{
        radius:(hasC?(10+frac*26):6)+(isSel?3:0),
        fillColor,fillOpacity:isSel?0.92:hasC?(0.5+frac*0.35):0.1,
        color:isSel?'#ffffff':hasC?fillColor:'rgba(74,85,104,0.15)',
        weight:isSel?2.5:hasC?1:0.4,opacity:hasC?0.9:0.2
      });
      if(hasC){
        const lbl=cs.highRisk>=1000?(cs.highRisk/1000).toFixed(1)+'k':cs.highRisk;
        L.marker([city.lat,city.lng],{icon:L.divIcon({className:'',html:'<div style="font-family:\'DM Mono\',monospace;font-size:10px;font-weight:500;color:rgba(255,255,255,0.95);pointer-events:none;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,0.9);transform:translateX(-50%)">'+lbl+'</div>',iconAnchor:[0,0]}),interactive:false,zIndexOffset:1000}).addTo(markerLayer);
        const chLow=cs.count-cs.highRisk-cs.medRisk;
        const chHp=Math.round(cs.highRisk/cs.count*100);
        const chMp=Math.round(cs.medRisk/cs.count*100);
        const chLp=Math.round(chLow/cs.count*100);
        const chPopup='<div style="font-family:\'DM Mono\',monospace;min-width:180px">'
          +'<div style="font-size:13px;color:#fb7185;margin-bottom:2px;font-weight:500">'+esc(city.name)+'</div>'
          +'<div style="font-size:9px;color:#64748b;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px">'+city.reg+'</div>'
          +'<div style="display:flex;height:6px;border-radius:3px;overflow:hidden;gap:1px;margin-bottom:5px">'
          +(cs.highRisk>0?'<div style="flex:'+cs.highRisk+';background:#fb7185"></div>':'')
          +(cs.medRisk>0?'<div style="flex:'+cs.medRisk+';background:#f97316"></div>':'')
          +(chLow>0?'<div style="flex:'+chLow+';background:#fbbf24"></div>':'')
          +'</div>'
          +'<div style="display:flex;gap:8px;margin-bottom:10px">'
          +'<span style="font-size:8px;color:#fb7185">● '+chHp+'% alto</span>'
          +'<span style="font-size:8px;color:#f97316">● '+chMp+'% medio</span>'
          +'<span style="font-size:8px;color:#fbbf24">● '+chLp+'% basso</span>'
          +'</div>'
          +'<div style="display:flex;flex-direction:column;gap:3px">'
          +'<div style="display:flex;justify-content:space-between;font-size:10px"><span style="color:#64748b">Alto rischio (≥60)</span><span style="color:#fb7185">'+cs.highRisk+'</span></div>'
          +'<div style="display:flex;justify-content:space-between;font-size:10px"><span style="color:#64748b">Medio rischio</span><span style="color:#f97316">'+cs.medRisk+'</span></div>'
          +'<div style="display:flex;justify-content:space-between;font-size:10px"><span style="color:#64748b">Score medio</span><span style="color:#dde4f0">'+cs.avgScore+'/100</span></div>'
          +'</div></div>';
        circle.on('mouseover',()=>{
          L.popup({className:'lf-popup',maxWidth:220}).setLatLng([city.lat,city.lng]).setContent(chPopup).openOn(leafletMap);
        });
        circle.on('mouseout',()=>{ leafletMap.closePopup(); });
        circle.on('click',e=>{
          e.originalEvent.stopPropagation();
          leafletMap.closePopup();
          selectedAnalysisCity=city.id;
          renderAnalysisMarkers();
          renderAnalysisPanel();
        });
      }
      circle.addTo(markerLayer);
    }
    return;
  }

  // ── Gap / Demographic / Projection: evidenzia aiCities ─────────
  for(const city of active){
    const isAi=aiCities.has(city.id);
    const isSel=selectedAnalysisCity===city.id;
    const frac=city.count/maxBase;
    const col=isAi?'#22d3c8':'rgba(74,85,104,0.25)';
    const circle=L.circleMarker([city.lat,city.lng],{
      radius:(isAi?(11+frac*18):6)+(isSel?3:0),
      fillColor:col,fillOpacity:isSel?0.92:isAi?0.7:0.1,
      color:isSel?'#ffffff':col,weight:isSel?2.5:isAi?1:0.4,opacity:isAi?0.9:0.2
    });
    if(isAi){
      circle.on('click',e=>{
        e.originalEvent.stopPropagation();
        selectedAnalysisCity=city.id;
        renderAnalysisMarkers();
        renderAnalysisPanel();
      });
    }
    circle.addTo(markerLayer);
  }
}
