// engine/customer.js
// Dipendenze: correlation.js (findSimilarProfiles), globals (CUSTOMERS, PRODUCTS, PSHORT)
// Funzioni: queryCustomer(customerId)

// ── CLIENTE SPECIFICO ─────────────────────────────────────────────
function queryCustomer(customerId){
  let customer=null;
  for(const r of CUSTOMERS){
    if(r[0]===customerId){customer={id:r[0],cityId:r[1],eta:r[2],stato:r[3],reddito:r[4],pmask:r[5]};break;}
  }
  if(!customer) return null;
  const pool=CUSTOMERS.map(r=>({id:r[0],cityId:r[1],eta:r[2],stato:r[3],reddito:r[4],pmask:r[5]}));
  const similar=findSimilarProfiles(customer,pool,{age:5,income:0.20});
  const sn=similar.length;
  const opps=[];
  for(let pi=0;pi<7;pi++){
    if(customer.pmask&(1<<pi)) continue;
    const wp=similar.filter(c=>(c.pmask&(1<<pi))).length;
    const corr=sn>0?wp/sn:0;
    if(corr>=0.20) opps.push({product:pi,name:PRODUCTS[pi],short:PSHORT[pi],correlation:corr,withProd:wp,total:sn});
  }
  opps.sort((a,b)=>b.correlation-a.correlation);
  return{customer,opportunities:opps,similarCount:sn};
}
