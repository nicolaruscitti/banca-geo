// engine/correlation.js
// Dipendenze: globals (CUSTOMERS, cityAgg, getCityCustomers, F)
// Funzioni: pearsonCorrelation(a,b), getAllFilteredCustomers(), findSimilarProfiles(cust,pool,tol)

// ── correlation engine ────────────────────────────────────────────
function pearsonCorrelation(a,b){
  const n=a.length;if(n<3) return 0;
  let ma=0,mb=0;
  for(let i=0;i<n;i++){ma+=a[i];mb+=b[i];}
  ma/=n;mb/=n;
  let num=0,da=0,db=0;
  for(let i=0;i<n;i++){const x=a[i]-ma,y=b[i]-mb;num+=x*y;da+=x*x;db+=y*y;}
  return(da&&db)?num/Math.sqrt(da*db):0;
}

function getAllFilteredCustomers(extra){
  const out=[];
  for(const city of Object.values(cityAgg)){
    if(extra&&extra.cityId&&city.id!==extra.cityId) continue;
    const cs=getCityCustomers(city.id);
    for(const c of cs){
      if(extra){
        if(extra.statuses&&extra.statuses.length&&!extra.statuses.includes(c.stato)) continue;
        if(extra.incomeRange){
          if(c.reddito<(extra.incomeRange.min||0)) continue;
          if(extra.incomeRange.max!==Infinity&&c.reddito>extra.incomeRange.max) continue;
        }
        if(extra.ageFilter){
          if(c.eta<extra.ageFilter.min||c.eta>extra.ageFilter.max) continue;
        }
      }
      out.push(Object.assign({},c,{cityId:city.id}));
    }
  }
  return out;
}

function findSimilarProfiles(cust,pool,tol){
  if(!tol) tol={age:5,income:0.20};
  const lo=cust.reddito*(1-tol.income),hi=cust.reddito*(1+tol.income);
  return pool.filter(c=>
    c.id!==cust.id&&c.stato===cust.stato&&
    Math.abs(c.eta-cust.eta)<=tol.age&&
    c.reddito>=lo&&c.reddito<=hi
  );
}
