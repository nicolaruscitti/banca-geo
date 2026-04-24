// data/revenues.js
// Dipendenze: globals (CUSTOMERS — definito inline nell'HTML prima di questo script)
// Esporta: CUSTOMER_REVENUES, getRevenue(customerId, productIndex),
//          getCustomerTotalRevenue(customerId, pmask)
//
// ── Logica ricavi mensili ─────────────────────────────────────────────────────
//
//  Prodotto          Tipo       Logica
//  ─────────────── ─────────── ─────────────────────────────────────────────────
//  0 Conto Corrente  Fisso      €8/mese  (canone tenuta conto)
//  1 Carta Debito    Fisso      €2/mese  (quota annua / 12)
//  2 Carta Credito   Fisso      €12/mese (quota annua/12 + margine interscambio)
//  3 Mutuo           Variabile  €300–€1.000/mese  ↑ proporzionale al reddito
//                               (spread su interessi del mutuo)
//  4 Investimenti    Variabile  €10–€50/mese      ↑ proporzionale al reddito
//                               (commissioni di gestione patrimonio)
//  5 Ass. Vita       Variabile  €50–€8/mese       ↓ inversamente prop. all'età
//                               (margine assicurativo: clienti giovani = rischio
//                                basso = margine più alto per la banca)
//  6 Ass. Casa       Variabile  €15–€80/mese      ↑ proporzionale al reddito
//                               (premio stimato in funzione del valore immobile)
//
// ── Cache (lazy) ─────────────────────────────────────────────────────────────
// CUSTOMER_REVENUES è costruito al primo accesso, non al caricamento dello script,
// perché CUSTOMERS è definito nell'<script> inline successivo.

let CUSTOMER_REVENUES = null;

function _buildRevenueCache(){
  if(CUSTOMER_REVENUES) return;
  const INC_MIN = 8000,  INC_MAX = 77000;
  const AGE_MIN = 18,    AGE_MAX = 79;
  CUSTOMER_REVENUES = {};
  for(const [id, , eta, , reddito] of CUSTOMERS){
    const t = Math.min(1, Math.max(0, (reddito - INC_MIN) / (INC_MAX - INC_MIN)));
    const a = Math.min(1, Math.max(0, (eta    - AGE_MIN) / (AGE_MAX - AGE_MIN)));
    CUSTOMER_REVENUES[id] = [
       8,                          // 0 Conto Corrente — fisso €8
       2,                          // 1 Carta Debito   — fisso €2
      12,                          // 2 Carta Credito  — fisso €12
      Math.round(300 + t * 700),   // 3 Mutuo          — €300–€1.000  (↑ reddito)
      Math.round( 10 + t *  40),   // 4 Investimenti   — €10–€50      (↑ reddito)
      Math.round( 50 - a *  42),   // 5 Ass. Vita      — €50–€8       (↓ età)
      Math.round( 15 + t *  65)    // 6 Ass. Casa      — €15–€80      (↑ reddito)
    ];
  }
}

// ── API pubblica ──────────────────────────────────────────────────────────────

/** Ricavo mensile della banca per un singolo (cliente, prodotto).
 *  @param {number} customerId   - ID cliente (1–10.000)
 *  @param {number} productIndex - Indice prodotto (0–6)
 *  @returns {number} Ricavo in euro/mese, 0 se non trovato.
 */
function getRevenue(customerId, productIndex){
  _buildRevenueCache();
  const r = CUSTOMER_REVENUES[customerId];
  return r ? (r[productIndex] ?? 0) : 0;
}

/** Ricavo mensile totale della banca per un cliente su tutti i prodotti posseduti.
 *  @param {number} customerId - ID cliente (1–10.000)
 *  @param {number} pmask      - Bitmask prodotti posseduti
 *  @returns {number} Somma dei ricavi mensili in euro.
 */
function getCustomerTotalRevenue(customerId, pmask){
  _buildRevenueCache();
  const r = CUSTOMER_REVENUES[customerId];
  if(!r) return 0;
  let total = 0;
  for(let i = 0; i < 7; i++) if(pmask & (1 << i)) total += r[i];
  return total;
}
