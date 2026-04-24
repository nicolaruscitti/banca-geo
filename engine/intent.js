// engine/intent.js
// Dipendenze: extractors.js
// Funzioni: detectIntent(q)

// ── detectIntent v8 — CORRETTO ────────────────────────────────────
// Bug v7: "Chi può ricevere proposta Investimenti?" non matchava crosssell.
// Fix: aggiunto "proposta","ricever","candidat","chi non ha","chi può","proporre"
// Fix: proiezione e gap controllati PRIMA di crosssell per evitare collisioni
// Fix: fallback su prodotto rilevato → crosssell
function detectIntent(q){
  const ql=q.toLowerCase();

  // Estrai sempre i filtri contestuali (città, stato, reddito, età)
  const _city=extractCity(ql);
  const _stato=extractStatoFilter(ql);
  const _income=extractIncomeRange(ql);
  const _age=extractAgeRange(ql);

  // 1. Cliente specifico (priorità massima)
  const custId=extractCustomerId(ql);
  if(custId!==null) return{type:'customer',customerId:custId};

  // 2. Proiezione temporale
  if(/proiezion|evolu|futuro|prossim.*ann|ann.*prossim|cambier|crescer|previs|nei prossim|\d+\s*ann.*futur|come\s+cambier/i.test(ql))
    return{type:'projection',years:extractYears(ql),cityId:_city,statuses:_stato,incomeRange:_income,ageFilter:_age};

  // 3. Waterfall / gap di cattura ricavi (prima del gap generico per evitare collisioni su "gap")
  if(/waterfall|gap.di.cattura|ricavi.potenziali|opportunit.*euro|potenziale.ricavo|tasso.di.cattura|quanto.perdiamo|ricavi.persi|quanto.si.perde|ricavi.non.catturati|cattura.ricavi/i.test(ql))
    return{type:'waterfall',cityId:_city,statuses:_stato,incomeRange:_income,ageFilter:_age};

  // 3.5 Gap analysis (fascia età esplicita + keyword gap/fascia)
  if(/\bgap\b|prodott.*mancano|mancano.*prodott|fasc.*prodott|prodott.*fasc|fascia.*\d{2}|\d{2}.*ann.*fasc|quali prodott.*mancano/i.test(ql)){
    const ar=_age||{min:30,max:45};
    return{type:'gap',ageRange:ar,cityId:_city,statuses:_stato,incomeRange:_income};
  }

  // 3.7 Churn risk
  if(/\bchurn\b|rischio.*abbandono|abbandono.*rischio|client.*rischio|rischio.*client|chi rischia|a rischio|perder.*client|client.*perder|potrebbero abbandonar|tasso.*abbandono|potenzial.*uscit|abbandoner|stanno per andarsene/i.test(ql))
    return{type:'churn',cityId:_city,statuses:_stato,incomeRange:_income,ageFilter:_age};

  // 4. Cross-sell — pattern v8 molto più ampio
  if(/propon|sugger|cross.?sell|opportunit|nuov.*prodott|prodott.*manca|puoi propor|chi.*prodott|proposta|candidat|ricever|chi non ha|non hanno ancora|posso propor|trova.*client|client.*per|per.*prodott|chi pu[o\xf2]|proporre|fare una proposta|proponi|consiglia/i.test(ql))
    return{type:'crosssell',product:extractProduct(ql),cityId:_city,statuses:_stato,incomeRange:_income,ageFilter:_age};

  // 5. Confronto demografico
  if(/single|coppi|famigl|confron|differ.*segm|segm.*differ|\bnord\b|\bsud\b|centro|isole|region/i.test(ql))
    return{type:'demographic',segments:extractSegments(ql),regions:extractRegion(ql),cityId:_city,incomeRange:_income,ageFilter:_age,statuses:[]};

  // 6. Fallback: se c'è un prodotto senza contesto → cross-sell
  const prod=extractProduct(ql);
  if(prod!==null) return{type:'crosssell',product:prod,cityId:_city,statuses:_stato,incomeRange:_income,ageFilter:_age};

  // 7. Fallback: fascia età → gap
  if(_age) return{type:'gap',ageRange:_age,cityId:_city,statuses:_stato,incomeRange:_income};

  return{type:'general'};
}
