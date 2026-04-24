// engine/projection.js
// Dipendenze: correlation.js (getAllFilteredCustomers), globals (HISTORY, PRODUCTS)
// Funzioni: queryProjection(years)

// ── PROIEZIONE TEMPORALE ──────────────────────────────────────────
function queryProjection(years,extra){
  let s2c=0,c2f=0,s2f=0,fromS=0,fromC=0;
  for(const e of Object.values(HISTORY)){
    if(e.length<2) continue;
    const f=e[0][1],l=e[e.length-1][1];
    if(f===0){fromS++;if(l===1)s2c++;else if(l===2)s2f++;}
    else if(f===1){fromC++;if(l===2)c2f++;}
  }
  const rS2C=fromS?s2c/fromS:0.05,rS2F=fromS?s2f/fromS:0.02,rC2F=fromC?c2f/fromC:0.04;
  const aS2C=1-Math.pow(1-rS2C,1/3),aS2F=1-Math.pow(1-rS2F,1/3),aC2F=1-Math.pow(1-rC2F,1/3);
  const allCusts=getAllFilteredCustomers(extra);
  const n=allCusts.length;if(!n) return null;
  const sCnt=[0,0,0],sMasks=[[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]],curM=[0,0,0,0,0,0,0];
  for(const c of allCusts){
    sCnt[c.stato]++;
    for(let b=0;b<7;b++) if(c.pmask&(1<<b)){sMasks[c.stato][b]++;curM[b]++;}
  }
  const sPct=sMasks.map((m,si)=>m.map(v=>sCnt[si]?v/sCnt[si]:0));
  const curPct=curM.map(v=>v/n);
  let fS=sCnt[0],fC=sCnt[1],fF=sCnt[2];
  for(let y=0;y<years;y++){
    const dS2C=fS*aS2C,dS2F=fS*aS2F,dC2F=fC*aC2F;
    fS=Math.max(0,fS-dS2C-dS2F);fC=Math.max(0,fC+dS2C-dC2F);fF=Math.max(0,fF+dS2F+dC2F);
  }
  const fTot=fS+fC+fF||1;
  const futPct=[];
  for(let pi=0;pi<7;pi++) futPct.push((fS*sPct[0][pi]+fC*sPct[1][pi]+fF*sPct[2][pi])/fTot);
  return{years,n,
    cur:{s:sCnt[0]/n,c:sCnt[1]/n,f:sCnt[2]/n,prod:curPct},
    fut:{s:fS/fTot,c:fC/fTot,f:fF/fTot,prod:futPct},
    delta:{s:fS/fTot-sCnt[0]/n,c:fC/fTot-sCnt[1]/n,f:fF/fTot-sCnt[2]/n,
           prod:futPct.map((v,i)=>v-curPct[i])},
    rates:{s2c:aS2C,s2f:aS2F,c2f:aC2F},
    histN:Object.keys(HISTORY).length
  };
}
