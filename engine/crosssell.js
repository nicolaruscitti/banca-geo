// engine/crosssell.js
// Dipendenze: correlation.js (getAllFilteredCustomers), globals (PRODUCTS)
// Funzioni: queryCrossSell(productIndex)

// ── CROSS-SELL v8 ─────────────────────────────────────────────────
// THRESH abbassato a 20% (era 30%). Bucket min ridotto a 4 (era 6).
function queryCrossSell(productIndex,extra){
  const prodsToCheck=productIndex!==null?[productIndex]:[2,3,4,5,6];
  const allCusts=getAllFilteredCustomers(extra);
  if(!allCusts.length) return{candidates:[],byCityId:{},n:0};

  const bkt={};
  for(const c of allCusts){
    const k=c.stato+'_'+Math.floor(c.eta/10)+'_'+Math.floor(c.reddito/15000);
    if(!bkt[k]) bkt[k]={cs:[],m:[0,0,0,0,0,0,0]};
    bkt[k].cs.push(c);
    for(let b=0;b<7;b++) if(c.pmask&(1<<b)) bkt[k].m[b]++;
  }

  const THRESH=20;
  const cands=[];
  for(const p of prodsToCheck){
    for(const bk of Object.values(bkt)){
      const bn=bk.cs.length;
      if(bn<4) continue;
      const pctV=Math.round(bk.m[p]/bn*100);
      if(pctV<THRESH) continue;
      for(const cc of bk.cs){
        if(!(cc.pmask&(1<<p)))
          cands.push(Object.assign({},cc,{product:p,correlation:pctV,similarCount:bn}));
      }
    }
  }
  cands.sort((a,b)=>b.correlation-a.correlation);
  const byCityId={};
  for(const c of cands){
    if(!byCityId[c.cityId]) byCityId[c.cityId]=[];
    byCityId[c.cityId].push(c);
  }
  return{candidates:cands.slice(0,200),byCityId,n:allCusts.length};
}
