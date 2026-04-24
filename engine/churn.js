// engine/churn.js
// Dipendenze: CUSTOMERS, CITIES, HISTORY (inline globals), F (stato filtro globale)
// Funzioni: computeChurnScore(), queryChurn()

// ── Score individuale (0–100) ─────────────────────────────────────────────────
// Fattori:
//   1. Profondità prodotti   (0–40 pt): meno prodotti → rischio alto
//   2. Assenza prodotti premium (0–25 pt): nessun Mutuo/Inv/Vita/Casa
//   3. Transizione storica negativa (0–25 pt): Famiglia→Coppia o Coppia→Single
//   4. Reddito sotto soglia città (0–10 pt): < 55% del reddito mercato
function computeChurnScore(id, eta, stato, reddito, pmask, cityId) {
  let score = 0;

  // 1. Profondità prodotti
  const prodCount = [0,1,2,3,4,5,6].filter(i => pmask & (1 << i)).length;
  // 1→40, 2→27, 3→13, 4+→0
  score += Math.max(0, Math.round(40 * (1 - Math.min(prodCount - 1, 3) / 3)));

  // 2. Nessun prodotto premium (bit 3=Mutuo, 4=Inv, 5=Vita, 6=Casa)
  if (!(pmask & 0b1111000)) score += 25;

  // 3. Transizione stato civile negativa in HISTORY
  const hist = (typeof HISTORY !== 'undefined') ? HISTORY[String(id)] : null;
  if (hist) {
    const sorted = hist.slice().sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i][1] < sorted[i - 1][1]) { score += 25; break; }
    }
  }

  // 4. Reddito sotto 55% del reddito mercato della città
  const city = CITIES.find(c => c.id === cityId);
  if (city && city.rm > 0 && reddito < city.rm * 0.55) score += 10;

  return Math.min(100, score);
}

// ── Label rischio ─────────────────────────────────────────────────────────────
function churnRiskLabel(score) {
  if (score >= 60) return 'Alto';
  if (score >= 30) return 'Medio';
  return 'Basso';
}

// ── Motivi del rischio (array di stringhe brevi) ──────────────────────────────
function _churnReasons(id, reddito, pmask, cityId) {
  const reasons = [];
  const prodCount = [0,1,2,3,4,5,6].filter(i => pmask & (1 << i)).length;
  if (prodCount <= 1) reasons.push('1 prodotto');
  else if (prodCount === 2) reasons.push('2 prodotti');
  if (!(pmask & 0b1111000)) reasons.push('no premium');
  const hist = (typeof HISTORY !== 'undefined') ? HISTORY[String(id)] : null;
  if (hist) {
    const s = hist.slice().sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < s.length; i++) {
      if (s[i][1] < s[i - 1][1]) { reasons.push('transiz. negativa'); break; }
    }
  }
  const city = CITIES.find(c => c.id === cityId);
  if (city && city.rm > 0 && reddito < city.rm * 0.55) reasons.push('reddito basso');
  return reasons;
}

// ── Query principale ──────────────────────────────────────────────────────────
// extra: { cityId, statuses, incomeRange, ageFilter }
// Ritorna: { customers, byCityId, n, avgScore, totalHigh }
//   byCityId[cityId] = { avgScore, highRisk, medRisk, count, custs }
function queryChurn(extra) {
  const { cityId, statuses, incomeRange, ageFilter } = extra || {};
  const { ageMin: fAgeMin, ageMax: fAgeMax,
          incomeMin: fIncMin, incomeMax: fIncMax,
          statuses: fSt, products: fPr } = F;

  const allCusts = [];
  const byCityId = {};

  for (const [id, cid, eta, stato, reddito, pmask] of CUSTOMERS) {
    // Filtri globali sidebar
    if (eta < fAgeMin || eta > fAgeMax) continue;
    if (reddito < fIncMin || reddito > fIncMax) continue;
    if (fSt.length > 0 && !fSt.includes(stato)) continue;
    if (fPr.length > 0 && !fPr.every(p => pmask & (1 << p))) continue;

    // Filtri contestuali dalla query
    if (cityId && cid !== cityId) continue;
    if (statuses && statuses.length > 0 && !statuses.includes(stato)) continue;
    if (incomeRange) {
      if (reddito < incomeRange.min) continue;
      if (incomeRange.max !== Infinity && reddito > incomeRange.max) continue;
    }
    if (ageFilter) {
      if (eta < ageFilter.min || eta > ageFilter.max) continue;
    }

    const score   = computeChurnScore(id, eta, stato, reddito, pmask, cid);
    const reasons = _churnReasons(id, reddito, pmask, cid);
    const entry   = { id, eta, stato, reddito, pmask, cityId: cid, score, reasons };

    allCusts.push(entry);
    if (!byCityId[cid]) byCityId[cid] = [];
    byCityId[cid].push(entry);
  }

  // Ordina globale per score decrescente
  allCusts.sort((a, b) => b.score - a.score);

  // Sommari per città
  const citySummary = {};
  for (const [cid, custs] of Object.entries(byCityId)) {
    custs.sort((a, b) => b.score - a.score);
    const avgScore = Math.round(custs.reduce((s, c) => s + c.score, 0) / custs.length);
    const highRisk = custs.filter(c => c.score >= 60).length;
    const medRisk  = custs.filter(c => c.score >= 30 && c.score < 60).length;
    citySummary[cid] = { avgScore, highRisk, medRisk, count: custs.length, custs };
  }

  const totalHigh = allCusts.filter(c => c.score >= 60).length;
  const avgScore  = allCusts.length
    ? Math.round(allCusts.reduce((s, c) => s + c.score, 0) / allCusts.length)
    : 0;

  return { customers: allCusts, byCityId: citySummary, n: allCusts.length, avgScore, totalHigh };
}
