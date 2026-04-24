// engine/gap.js
// Dipendenze: correlation.js (getAllFilteredCustomers), globals (PRODUCTS, PSHORT, cityAgg, getCityCustomers)
// Funzioni: queryGap(ageMin, ageMax)

// ── GAP ANALYSIS ──────────────────────────────────────────────────
function queryGap(ageMin,ageMax,extra){
  const allCusts=getAllFilteredCustomers(extra);
  const n=allCusts.length;if(!n) return null;
  const gM=[0,0,0,0,0,0,0],segM=[0,0,0,0,0,0,0];let sn=0;
  for(const c of allCusts){
    for(let b=0;b<7;b++) if(c.pmask&(1<<b)) gM[b]++;
    if(c.eta>=ageMin&&c.eta<=ageMax){sn++;for(let b=0;b<7;b++) if(c.pmask&(1<<b)) segM[b]++;}
  }
  const gPct=gM.map(v=>v/n),sPct=segM.map(v=>sn?v/sn:0);
  const gaps=PRODUCTS.map((name,i)=>({i,name,short:PSHORT[i],segPct:sPct[i],globalPct:gPct[i],gap:gPct[i]-sPct[i]}))
    .sort((a,b)=>b.gap-a.gap);
  const mg=gaps[0];
  const cityGaps=[];
  for(const city of Object.values(cityAgg)){
    if(extra&&extra.cityId&&city.id!==extra.cityId) continue;
    const cc=getCityCustomers(city.id).filter(c=>c.eta>=ageMin&&c.eta<=ageMax);
    if(cc.length<4) continue;
    const wp=cc.filter(c=>c.pmask&(1<<mg.i)).length;
    cityGaps.push({cityId:city.id,name:city.name,pct:wp/cc.length,gap:gPct[mg.i]-wp/cc.length,cn:cc.length});
  }
  cityGaps.sort((a,b)=>b.gap-a.gap);
  return{gaps,segN:sn,totalN:n,ageMin,ageMax,topGapCities:cityGaps.slice(0,6)};
}
