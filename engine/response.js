// engine/response.js
// Dipendenze: crosssell.js, projection.js, demographic.js, gap.js, customer.js,
//             correlation.js (getAllFilteredCustomers), globals (PRODUCTS, PSHORT,
//             STATUS_LABELS, CITIES, cityAgg)
// Funzioni: generateResponse(intent, result)

// ── Descrizione filtri contestuali ────────────────────────────────
function fmtExtra(intent){
  const parts=[];
  if(intent.cityId){const c=CITIES.find(x=>x.id===intent.cityId);if(c) parts.push('città: **'+c.name+'**');}
  if(intent.statuses&&intent.statuses.length) parts.push('stato civile: **'+intent.statuses.map(s=>STATUS_LABELS[s]).join('/')+'**');
  if(intent.ageFilter) parts.push('età: **'+intent.ageFilter.min+'–'+intent.ageFilter.max+' anni**');
  if(intent.incomeRange){
    if(intent.incomeRange.max===Infinity) parts.push('reddito: **>€'+(intent.incomeRange.min/1000).toFixed(0)+'k**');
    else parts.push('reddito: **€'+(intent.incomeRange.min/1000).toFixed(0)+'k–€'+(intent.incomeRange.max/1000).toFixed(0)+'k**');
  }
  return parts.length?'_Filtri contestuali: '+parts.join(' · ')+'_\n\n':'';
}

// ── RESPONSE GENERATOR v8 — restituisce {text, actions, aiResult} ─
function generateResponse(intent,result){
  const pct=v=>Math.round(v*100);
  const pp=v=>(v>=0?'+':'')+Math.round(v*100)+'pp';
  let text='',actions=[],aiResult={type:intent.type,result};

  if(intent.type==='crosssell'){
    const prodName=intent.product!==null?PRODUCTS[intent.product]:'prodotti ad alto valore';
    text+=fmtExtra(intent);
    if(!result||!result.candidates.length){
      text+='Ho analizzato **'+getAllFilteredCustomers({cityId:intent.cityId,statuses:intent.statuses,incomeRange:intent.incomeRange,ageFilter:intent.ageFilter}).length.toLocaleString('it-IT')+'** clienti per **'+prodName+'** ma non ho trovato candidati significativi (soglia: 20% di correlazione).\n\n';
      text+='Possibili cause: prodotto già molto diffuso nel portafoglio, filtri sidebar troppo restrittivi, o pochi profili simili.\n';
      text+='Prova ad allargare i filtri età/reddito oppure chiedi per un prodotto diverso.';
      aiResult=null;
    }else{
      const {candidates,byCityId,n}=result;
      const topCities=Object.entries(byCityId).sort((a,b)=>b[1].length-a[1].length).slice(0,5);
      const avgCorr=Math.round(candidates.reduce((s,c)=>s+c.correlation,0)/candidates.length);
      text+='Ho analizzato **'+n.toLocaleString('it-IT')+'** clienti e trovato **'+candidates.length+' candidati** per **'+prodName+'** in **'+Object.keys(byCityId).length+' città**.\n\n';
      text+='**Logica**: cerco clienti senza '+prodName+' il cui profilo (stato civile, fascia d\'età, reddito ±€15k) presenta una correlazione \u2265'+avgCorr+'% con chi lo possiede già.\n\n';
      text+='**Città con più opportunità**: '+topCities.map(([id,cs])=>'**'+(cityAgg[+id]?cityAgg[+id].name:id)+'** ('+cs.length+')').join(', ')+'.\n';
      text+='Correlazione media: **'+avgCorr+'%**.\n\n';
      text+='_Clicca su una città nel pannello risultati qui sopra per vedere i clienti candidati._';
      const cityMetas={};
      for(const [id,cs] of Object.entries(byCityId))
        cityMetas[id]={candidates:cs.length,avgCorr:Math.round(cs.reduce((s,c)=>s+c.correlation,0)/cs.length)};
      actions.push({type:'highlight_cities',cityIds:topCities.map(([id])=>+id),meta:cityMetas});
      // Popola aiCustomers per le prime 5 città
      for(const [tcId,tcCusts] of topCities){
        actions.push({type:'highlight_customers',cityId:+tcId,cityMeta:cityMetas[tcId],
          customers:tcCusts.slice(0,30).map(c=>({id:c.id,suggest:[c.product],correlation:c.correlation/100,
            reason:c.correlation+'% dei profili simili ha già '+PRODUCTS[c.product]}))
        });
      }
      aiResult={type:'crosssell',result,prodName};
    }
  }else if(intent.type==='projection'){
    if(!result){text='Nessun dato disponibile con i filtri correnti.';aiResult=null;}
    else{
      const {years,cur,fut,delta,rates,histN,n}=result;
      text+=fmtExtra(intent);
      text+='Ho analizzato le transizioni di **'+histN.toLocaleString('it-IT')+'** clienti (2021\u20132024) e proiettato l\'evoluzione per **'+years+' anni** su '+n.toLocaleString('it-IT')+' clienti attuali.\n\n';
      text+='**Tassi annuali storici**: S\u2192C '+((rates.s2c||0)*100).toFixed(1)+'% \xb7 C\u2192F '+((rates.c2f||0)*100).toFixed(1)+'% \xb7 S\u2192F '+((rates.s2f||0)*100).toFixed(1)+'%.\n\n';
      text+='**Stato civile** oggi\u2192tra '+years+'a: Single '+pct(cur.s)+'%\u2192**'+pct(fut.s)+'%** \xb7 Coppia '+pct(cur.c)+'%\u2192**'+pct(fut.c)+'%** \xb7 Famiglia '+pct(cur.f)+'%\u2192**'+pct(fut.f)+'%** ('+pp(delta.f)+').\n\n';
      const bigD=delta.prod.map((d,i)=>({i,d,name:PRODUCTS[i],cur:cur.prod[i],fut:fut.prod[i]}))
        .filter(x=>Math.abs(x.d)>0.005).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d));
      if(bigD.length){
        text+='**Prodotti con maggiore variazione prevista**:\n';
        text+=bigD.slice(0,4).map(x=>'• '+x.name+': '+pct(x.cur)+'% \u2192 **'+pct(x.fut)+'%** ('+pp(x.d)+')').join('\n');
      }
      text+='\n\n_Vedi la tabella dettagliata nel pannello risultati qui sopra._';
      const ins='+'+years+'a: famiglie '+pp(delta.f)+(bigD[0]?' \xb7 '+bigD[0].name+' '+pp(bigD[0].d):'');
      actions.push({type:'prediction',insight:ins});
    }
  }else if(intent.type==='demographic'){
    if(!result||!result.g1||!result.g2){text='Dati insufficienti per il confronto richiesto.';aiResult=null;}
    else{
      const {g1,g2,s1,s2,prodCorr,regions}=result;
      const l1=STATUS_LABELS[s1[0]],l2=STATUS_LABELS[s2[0]];
      const regStr=regions.length?' in **'+regions.join('/')+'**':'';
      text+=fmtExtra(intent);
      text+='**'+l1+' vs '+l2+'**'+regStr+':\n';
      text+='• '+l1+': **'+g1.n.toLocaleString('it-IT')+'** clienti \xb7 reddito **\u20ac'+(g1.avgInc/1000).toFixed(0)+'k** \xb7 et\u00e0 **'+Math.round(g1.avgAge)+'a**\n';
      text+='• '+l2+': **'+g2.n.toLocaleString('it-IT')+'** clienti \xb7 reddito **\u20ac'+(g2.avgInc/1000).toFixed(0)+'k** \xb7 et\u00e0 **'+Math.round(g2.avgAge)+'a**\n\n';
      const diffs=PRODUCTS.map((name,i)=>({name,d1:g1.pct[i],d2:g2.pct[i],delta:g2.pct[i]-g1.pct[i],corr:prodCorr[i]}))
        .filter(d=>Math.abs(d.delta)>0.03).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
      if(diffs.length){
        text+='**Differenze significative nei prodotti** (>3pp):\n';
        text+=diffs.slice(0,5).map(d=>'• **'+d.name+'**: '+l1+' '+pct(d.d1)+'% \u2014 '+l2+' '+pct(d.d2)+'% ('+pp(d.delta)+' \xb7 corr.reddito: '+(d.corr*100).toFixed(0)+'%)').join('\n');
      }else{
        text+='Nessuna differenza significativa (>3%) nei prodotti tra i segmenti.';
      }
      const relCities=Object.values(cityAgg).filter(c=>!regions.length||regions.includes(c.reg)).sort((a,b)=>b.count-a.count).slice(0,6);
      if(relCities.length) actions.push({type:'highlight_cities',cityIds:relCities.map(c=>c.id)});
    }
  }else if(intent.type==='gap'){
    if(!result){text='Nessun dato disponibile.';aiResult=null;}
    else{
      const {gaps,segN,totalN,ageMin,ageMax,topGapCities}=result;
      const sigGaps=gaps.filter(g=>g.gap>0.03);
      text+=fmtExtra(intent);
      text+='Ho analizzato **'+segN.toLocaleString('it-IT')+'** clienti nella fascia '+ageMin+'\u2013'+ageMax+' anni (su '+totalN.toLocaleString('it-IT')+' totali).\n\n';
      if(sigGaps.length){
        text+='**Gap prodotti più significativi** (meno diffusi rispetto alla media):\n';
        text+=sigGaps.slice(0,5).map(g=>'• **'+g.name+'**: fascia '+pct(g.segPct)+'% vs media '+pct(g.globalPct)+'% \u2192 gap **\u2212'+pct(g.gap)+'pp**').join('\n')+'\n\n';
        if(topGapCities.length){
          text+='**Città con gap maggiore su '+gaps[0].name+'**: ';
          text+=topGapCities.slice(0,4).map(c=>c.name+' ('+pct(c.pct)+'%, \u2212'+pct(c.gap)+'pp)').join(', ')+'.';
          text+='\n\n_Vedi il pannello risultati e le città evidenziate sulla mappa._';
        }
      }else{
        text+='Nessun gap significativo (>3%) per la fascia '+ageMin+'\u2013'+ageMax+' anni.';
      }
      if(topGapCities.length) actions.push({type:'highlight_cities',cityIds:topGapCities.map(c=>c.cityId)});
    }
  }else if(intent.type==='waterfall'){
    if(!result||!result.cities||!result.cities.length){
      text='Nessun dato disponibile con i filtri correnti per l\'analisi waterfall.';aiResult=null;
    }else{
      const{cities,totalActual,totalGap,n}=result;
      const topCities=cities.slice(0,5);
      const fmtK=v=>v>=1000?'€'+(v/1000).toFixed(1)+'k':'€'+v;
      text+=fmtExtra(intent);
      text+='Ho analizzato **'+n.toLocaleString('it-IT')+'** clienti su **'+cities.length+' città** calcolando ricavi attuali vs potenziali (prodotti eleggibili non ancora posseduti).\n\n';
      text+='**Ricavi catturati**: '+fmtK(totalActual)+'/mese · **Potenziale non catturato**: **'+fmtK(totalGap)+'/mese**.\n\n';
      text+='**Top città per opportunità**:\n';
      text+=topCities.map(c=>'• **'+c.name+'**: gap **'+fmtK(c.gap)+'/mese** · '+c.captureRate+'% catturato ('+fmtK(c.actual)+' su '+fmtK(c.eligible)+')').join('\n');
      text+='\n\n_Clicca una città nel pannello per il dettaglio prodotto-per-prodotto. Apri il modal ⊞ → tab 💰 Waterfall per il grafico._';
      const cityIds=topCities.map(c=>c.cityId);
      actions.push({type:'highlight_cities',cityIds});
      actions.push({type:'waterfall_data',cities:topCities});
      aiResult={type:'waterfall',result};
    }
  }else if(intent.type==='churn'){
    if(!result||!result.n){
      text='Nessun cliente trovato con i filtri correnti per l\'analisi del rischio abbandono.';
      aiResult=null;
    }else{
      const{customers,byCityId,n,avgScore,totalHigh}=result;
      text+=fmtExtra(intent);
      text+='Ho analizzato **'+n.toLocaleString('it-IT')+'** clienti e calcolato il rischio abbandono su 4 fattori:\n';
      text+='profondità portafoglio · assenza prodotti premium · transizioni storiche negative · reddito vs città.\n\n';
      text+='**Rischio alto** (score ≥60): **'+totalHigh+'** clienti ('+Math.round(totalHigh/n*100)+'%) · ';
      text+='Score medio: **'+avgScore+'/100**.\n\n';
      const topCities=Object.entries(byCityId).sort((a,b)=>b[1].highRisk-a[1].highRisk).slice(0,5);
      if(topCities.length){
        text+='**Città con più clienti ad alto rischio**:\n';
        text+=topCities.map(([cid,cs])=>{const co=CITIES.find(c=>c.id===+cid);return '• **'+(co?co.name:cid)+'**: '+cs.highRisk+' alto · '+cs.medRisk+' medio · score medio '+cs.avgScore;}).join('\n');
      }
      text+='\n\n_Clicca una città nel pannello per vedere i clienti a rischio con i relativi score._';
      const cityIds=topCities.map(([cid])=>+cid);
      const meta={};
      for(const[cid,cs] of topCities) meta[cid]={candidates:cs.highRisk,avgScore:cs.avgScore};
      actions.push({type:'highlight_cities',cityIds,meta});
      for(const[cid,cs] of topCities){
        actions.push({type:'highlight_churn',cityId:+cid,
          customers:cs.custs.slice(0,30).map(c=>({id:c.id,score:c.score,reasons:c.reasons}))});
      }
      aiResult={type:'churn',result};
    }
  }else if(intent.type==='customer'){
    if(!result){text='**Cliente non trovato**. Specifica un ID valido (1\u201310.000), es: "analizza il cliente #42".';aiResult=null;}
    else{
      const {customer,opportunities,similarCount}=result;
      const cCity=CITIES.find(c=>c.id===customer.cityId);
      const hasP=[];for(let pi=0;pi<7;pi++) if(customer.pmask&(1<<pi)) hasP.push(PSHORT[pi]);
      text='**Cliente #'+customer.id+'** \u2014 '+STATUS_LABELS[customer.stato]+', '+customer.eta+' anni, \u20ac'+(customer.reddito/1000).toFixed(0)+'k \xb7 '+(cCity?cCity.name+' ('+cCity.reg+')':'?')+'.\n';
      text+='Prodotti: '+(hasP.length?hasP.join(', '):'nessuno')+'.\n';
      text+='Profili simili analizzati: **'+similarCount+'** (stesso stato civile, et\u00e0 \xb15, reddito \xb120%).\n\n';
      if(!opportunities.length){
        text+='Nessuna opportunit\u00e0 cross-sell significativa (soglia 20%).';
      }else{
        text+='**Opportunit\u00e0 cross-sell** (in ordine di correlazione):\n';
        text+=opportunities.map(o=>'• **'+o.name+'**: correlazione **'+pct(o.correlation)+'%** ('+o.withProd+'/'+o.total+' profili simili ce l\'hanno)').join('\n');
        if(cCity){
          actions.push({type:'highlight_cities',cityIds:[cCity.id]});
          actions.push({type:'highlight_customers',cityId:cCity.id,
            customers:[{id:customer.id,suggest:opportunities.slice(0,2).map(o=>o.product),
              correlation:opportunities[0].correlation,
              reason:pct(opportunities[0].correlation)+'% dei profili simili ha '+opportunities[0].name}]
          });
        }
      }
      text+='\n\n_Vedi la scheda nel pannello risultati qui sopra._';
    }
  }else{
    aiResult=null;
    const allC=getAllFilteredCustomers();
    const nn=allC.length;
    if(!nn){
      text='Nessun cliente visibile con i filtri correnti. Rimuovi i filtri dalla sidebar.';
    }else{
      const masks=[0,0,0,0,0,0,0];let sumInc=0,sumAge=0;
      for(const c of allC){sumInc+=c.reddito;sumAge+=c.eta;for(let b=0;b<7;b++) if(c.pmask&(1<<b)) masks[b]++;}
      const topP=masks.reduce((mi,v,i)=>v>masks[mi]?i:mi,0);
      text='Analizzo **'+nn.toLocaleString('it-IT')+'** clienti su '+Object.keys(cityAgg).length+' citt\u00e0.\n';
      text+='Reddito medio \u20ac'+(sumInc/nn/1000).toFixed(0)+'k \xb7 et\u00e0 media '+Math.round(sumAge/nn)+'a \xb7 prodotto pi\u00f9 diffuso: **'+PRODUCTS[topP]+'** ('+pct(masks[topP]/nn)+'%).\n\n';
      text+='Non ho capito la domanda. Puoi chiedermi:\n';
      text+='• "Chi pu\u00f2 ricevere la proposta di Investimenti?"\n';
      text+='• "Chi non ha ancora il Mutuo?"\n';
      text+='• "Proiezione distribuzione 5 anni"\n';
      text+='• "Gap prodotti fascia 30-45 anni"\n';
      text+='• "Confronto single e coppie in Nord Italia"\n';
      text+='• "Analizza il cliente #42"';
    }
  }
  return{text,actions,aiResult};
}
