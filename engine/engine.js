// engine/engine.js
// Dipendenze: intent.js, crosssell.js, projection.js, demographic.js,
//             gap.js, customer.js, response.js
// Funzioni: sendChat(q) — dispatcher principale, restituisce {text, actions, aiResult}

// ── Stato Analysis Mode ──────────────────────────────────────────────────────
let analysisMode     = false;   // true quando la mappa/pannello mostra risultati AI
let analysisResults  = null;    // dati ultima analisi: {type, result, prodName?}
let selectedAnalysisCity = null; // cityId nel dettaglio analisi (null = overview)

// ── sendChat v8: restituisce oggetto {text, actions, aiResult} ────
async function sendChat(q){
  await new Promise(r=>setTimeout(r,280));
  try{
    const intent=detectIntent(q);
    const extra={
      cityId:intent.cityId||null,
      statuses:intent.statuses||[],
      incomeRange:intent.incomeRange||null,
      ageFilter:intent.ageFilter||null
    };
    let result=null;
    if(intent.type==='waterfall')        result=queryWaterfall(extra);
    else if(intent.type==='churn')      result=queryChurn(extra);
    else if(intent.type==='crosssell')       result=queryCrossSell(intent.product,extra);
    else if(intent.type==='projection') result=queryProjection(intent.years,extra);
    else if(intent.type==='demographic')result=queryDemographic(intent.segments,intent.regions||[],extra);
    else if(intent.type==='gap')        result=queryGap(intent.ageRange.min,intent.ageRange.max,extra);
    else if(intent.type==='customer')   result=queryCustomer(intent.customerId);
    return generateResponse(intent,result);
  }catch(e){
    return{text:'**Errore nell\'analisi**: '+esc(e.message),actions:[],aiResult:null};
  }
}
