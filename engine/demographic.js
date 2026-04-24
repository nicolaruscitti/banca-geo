// engine/demographic.js
// Dipendenze: correlation.js (pearsonCorrelation, getAllFilteredCustomers), globals (cityAgg)
// Funzioni: queryDemographic(segments, regions)

// ── ANALISI DEMOGRAFICA ───────────────────────────────────────────
function queryDemographic(segments,regions,extra){
  const allCusts=getAllFilteredCustomers(extra);
  const filtered=regions.length
    ?allCusts.filter(c=>regions.includes(cityAgg[c.cityId]&&cityAgg[c.cityId].reg))
    :allCusts;
  function grpStats(seg){
    const cs=filtered.filter(c=>seg.includes(c.stato));
    const nn=cs.length;if(!nn) return null;
    let inc=0,age=0;const m=[0,0,0,0,0,0,0];
    for(const c of cs){inc+=c.reddito;age+=c.eta;for(let b=0;b<7;b++) if(c.pmask&(1<<b)) m[b]++;}
    return{n:nn,avgInc:inc/nn,avgAge:age/nn,pct:m.map(v=>v/nn)};
  }
  const s1=[segments[0]],s2=[segments.length>1?segments[1]:(segments[0]===0?1:0)];
  const g1=grpStats(s1),g2=grpStats(s2);
  const incArr=filtered.map(c=>c.reddito);
  const prodCorr=[];
  for(let pi=0;pi<7;pi++){
    const pa=filtered.map(c=>(c.pmask&(1<<pi))?1:0);
    prodCorr.push(pearsonCorrelation(incArr,pa));
  }
  return{g1,g2,s1,s2,prodCorr,regions,n:filtered.length};
}
