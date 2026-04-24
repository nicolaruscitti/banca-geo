// engine/waterfall.js
// Dipendenze: CUSTOMERS, CITIES, revenues.js (CUSTOMER_REVENUES, _buildRevenueCache),
//             F (filtri globali), getCityCustomers (panel.js — disponibile a call-time)
// Funzioni: getEligibleProducts(), getCityWaterfall(), queryWaterfall()

// ── Regole di eleggibilità per prodotto ──────────────────────────────────────
// Stima quali prodotti un cliente "dovrebbe" avere in base al profilo demografico.
// Usato come tetto massimo per il calcolo del potenziale di ricavo.
//
//  0 C/C           → tutti
//  1 Carta Debito  → tutti
//  2 Carta Credito → reddito ≥ €15.000
//  3 Mutuo         → Coppia/Famiglia, età 25–58, reddito ≥ €22.000
//  4 Investimenti  → reddito ≥ €28.000
//  5 Ass. Vita     → Coppia/Famiglia oppure età ≥ 35
//  6 Ass. Casa     → Coppia o Famiglia
function getEligibleProducts(eta, stato, reddito) {
  const el = [0, 1]; // C/C e Carta Debito: tutti
  if (reddito >= 15000) el.push(2);
  if ((stato === 1 || stato === 2) && eta >= 25 && eta <= 58 && reddito >= 22000) el.push(3);
  if (reddito >= 28000) el.push(4);
  if (stato === 1 || stato === 2 || eta >= 35) el.push(5);
  if (stato === 1 || stato === 2) el.push(6);
  return el;
}

// ── Waterfall per singola città ───────────────────────────────────────────────
// Ritorna: { products, n, totalActual, totalEligible, totalGap, captureRate }
//   products[i] = { i, name, actual, eligible, gap, actualN, eligibleN, captureRate }
function getCityWaterfall(cityId) {
  _buildRevenueCache();
  const custs = getCityCustomers(cityId);
  if (!custs || !custs.length) return null;

  const actualSum    = new Array(7).fill(0);
  const eligibleSum  = new Array(7).fill(0);
  const actualCount  = new Array(7).fill(0);
  const eligibleCount= new Array(7).fill(0);

  for (const c of custs) {
    const rv  = CUSTOMER_REVENUES[c.id];
    if (!rv) continue;
    const el  = getEligibleProducts(c.eta, c.stato, c.reddito);
    for (const i of el) {
      eligibleCount[i]++;
      eligibleSum[i] += rv[i];
      if (c.pmask & (1 << i)) {
        actualCount[i]++;
        actualSum[i]  += rv[i];
      }
    }
  }

  const products = PRODUCTS.map((name, i) => ({
    i, name,
    actual:      Math.round(actualSum[i]),
    eligible:    Math.round(eligibleSum[i]),
    gap:         Math.round(eligibleSum[i] - actualSum[i]),
    actualN:     actualCount[i],
    eligibleN:   eligibleCount[i],
    captureRate: eligibleSum[i] > 0 ? Math.round(actualSum[i] / eligibleSum[i] * 100) : 100
  }));

  const totalActual   = Math.round(actualSum.reduce((s, v) => s + v, 0));
  const totalEligible = Math.round(eligibleSum.reduce((s, v) => s + v, 0));

  return {
    products,
    n:            custs.length,
    totalActual,
    totalEligible,
    totalGap:     totalEligible - totalActual,
    captureRate:  totalEligible > 0 ? Math.round(totalActual / totalEligible * 100) : 100
  };
}

// ── Query globale (per chat AI) ───────────────────────────────────────────────
// Ritorna: { cities, totalActual, totalGap, n }
//   cities[k] = { cityId, name, reg, actual, eligible, gap, captureRate, count }
function queryWaterfall(extra) {
  const { cityId, statuses, incomeRange, ageFilter } = extra || {};
  const { ageMin: fAgeMin, ageMax: fAgeMax,
          incomeMin: fIncMin, incomeMax: fIncMax,
          statuses: fSt, products: fPr } = F;

  _buildRevenueCache();

  const acc = {};

  for (const [id, cid, eta, stato, reddito, pmask] of CUSTOMERS) {
    // Filtri globali sidebar
    if (eta < fAgeMin || eta > fAgeMax) continue;
    if (reddito < fIncMin || reddito > fIncMax) continue;
    if (fSt.length > 0 && !fSt.includes(stato)) continue;
    if (fPr.length > 0 && !fPr.every(p => pmask & (1 << p))) continue;
    // Filtri contestuali
    if (cityId && cid !== cityId) continue;
    if (statuses && statuses.length > 0 && !statuses.includes(stato)) continue;
    if (incomeRange) {
      if (reddito < incomeRange.min) continue;
      if (incomeRange.max !== Infinity && reddito > incomeRange.max) continue;
    }
    if (ageFilter && (eta < ageFilter.min || eta > ageFilter.max)) continue;

    const rv  = CUSTOMER_REVENUES[id];
    if (!rv) continue;
    const el  = getEligibleProducts(eta, stato, reddito);
    if (!acc[cid]) acc[cid] = { actual: 0, eligible: 0, count: 0 };
    for (const i of el) {
      acc[cid].eligible += rv[i];
      if (pmask & (1 << i)) acc[cid].actual += rv[i];
    }
    acc[cid].count++;
  }

  const cities = Object.entries(acc).map(([cid, d]) => {
    const city = CITIES.find(c => c.id === +cid);
    return {
      cityId:      +cid,
      name:        city ? city.name : cid,
      reg:         city ? city.reg  : '',
      actual:      Math.round(d.actual),
      eligible:    Math.round(d.eligible),
      gap:         Math.round(d.eligible - d.actual),
      captureRate: d.eligible > 0 ? Math.round(d.actual / d.eligible * 100) : 100,
      count:       d.count
    };
  }).sort((a, b) => b.gap - a.gap);

  const totalActual = cities.reduce((s, c) => s + c.actual, 0);
  const totalGap    = cities.reduce((s, c) => s + c.gap,    0);
  const n           = cities.reduce((s, c) => s + c.count,  0);

  return { cities, totalActual, totalGap, n };
}
