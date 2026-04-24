// data/loader.js
// Legge i CSV a runtime, costruisce le costanti globali CITIES, CUSTOMERS, HISTORY.
// Espone window._dataReady (Promise) — il boot dell'app attende questa Promise.

(function () {
  'use strict';

  const BASE = '../data/';

  const PROD_MAP = {
    'Conto Corrente': 0, 'Carta Debito': 1, 'Carta Credito': 2,
    'Mutuo': 3, 'Investimenti': 4, 'Assicurazione Vita': 5, 'Assicurazione Casa': 6
  };
  const SM = { 'Single': 0, 'Coppia': 1, 'Famiglia': 2 };

  // ── Parser CSV minimale ──────────────────────────────────────────────────────
  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const vals = line.split(',');
      const obj = {};
      headers.forEach((h, j) => { obj[h] = (vals[j] || '').trim(); });
      rows.push(obj);
    }
    return rows;
  }

  // ── Aggiorna overlay di caricamento ─────────────────────────────────────────
  function setLoader(msg, pct) {
    const m = document.getElementById('loader-msg');
    const b = document.getElementById('loader-bar');
    if (m) m.textContent = msg;
    if (b) b.style.width = pct + '%';
  }

  // ── Promise principale ───────────────────────────────────────────────────────
  window._dataReady = (async function () {
    try {
      setLoader('Caricamento dati in corso…', 5);

      // Fetch parallelo dei 5 CSV necessari
      const [citiesText, customersText, cityMapText, productsText, historyText] =
        await Promise.all([
          fetch(BASE + 'city_profile.csv').then(r => { if (!r.ok) throw new Error('city_profile.csv non trovato'); return r.text(); }),
          fetch(BASE + 'customers.csv').then(r => { if (!r.ok) throw new Error('customers.csv non trovato'); return r.text(); }),
          fetch(BASE + 'customers_with_city_id.csv').then(r => { if (!r.ok) throw new Error('customers_with_city_id.csv non trovato'); return r.text(); }),
          fetch(BASE + 'product_holdings.csv').then(r => { if (!r.ok) throw new Error('product_holdings.csv non trovato'); return r.text(); }),
          fetch(BASE + 'customer_history.csv').then(r => { if (!r.ok) throw new Error('customer_history.csv non trovato'); return r.text(); }),
        ]);

      // ── CITIES ──────────────────────────────────────────────────────────────
      setLoader('Elaborazione città…', 30);
      window.CITIES = parseCSV(citiesText).map(r => ({
        id:   parseInt(r.city_id),
        name: r.city_name,
        reg:  r.regione,
        lat:  parseFloat(r.lat),
        lng:  parseFloat(r.lng),
        qi:   parseFloat(r.qualita_vita_index          || 0),
        di:   parseFloat(r.digital_infrastructure_index || 0),
        rm:   parseInt(r.reddito_medio                  || 0),
        cl:   parseFloat(r.costo_vita_index             || 0),
      }));

      // ── CUSTOMERS ───────────────────────────────────────────────────────────
      setLoader('Elaborazione clienti…', 52);

      const custCityMap = {};
      for (const r of parseCSV(cityMapText))
        custCityMap[r.customer_id] = parseInt(r.city_id);

      const pmaskMap = {};
      for (const r of parseCSV(productsText)) {
        const bit = PROD_MAP[r.prodotto];
        if (bit !== undefined)
          pmaskMap[r.customer_id] = (pmaskMap[r.customer_id] || 0) | (1 << bit);
      }

      window.CUSTOMERS = parseCSV(customersText).map(r => [
        parseInt(r.customer_id),
        custCityMap[r.customer_id] || 0,
        parseInt(r.eta),
        SM[r.stato_familiare] != null ? SM[r.stato_familiare] : 0,
        parseInt(parseFloat(r.reddito_annuo)),
        pmaskMap[r.customer_id] || 0,
      ]).sort((a, b) => a[0] - b[0]);

      // ── HISTORY ─────────────────────────────────────────────────────────────
      setLoader('Elaborazione storico…', 78);

      const histMap = {};
      for (const r of parseCSV(historyText)) {
        const key = String(parseInt(r.customer_id));
        if (!histMap[key]) histMap[key] = [];
        histMap[key].push([parseInt(r.anno), SM[r.stato] != null ? SM[r.stato] : 0]);
      }
      window.HISTORY = {};
      for (const [k, v] of Object.entries(histMap)) {
        const sorted = v.sort((a, b) => a[0] - b[0]);
        if (sorted.length >= 2) window.HISTORY[k] = sorted;
      }

      setLoader('Avvio applicazione…', 96);

      // Nascondi overlay con fade
      const ov = document.getElementById('loader-overlay');
      if (ov) {
        ov.style.transition = 'opacity .4s ease';
        ov.style.opacity = '0';
        setTimeout(() => { ov.style.display = 'none'; }, 450);
      }

    } catch (err) {
      const ov = document.getElementById('loader-overlay');
      if (ov) {
        ov.innerHTML =
          '<div style="font-family:\'DM Mono\',monospace;text-align:center;padding:0 24px">'
          + '<div style="font-size:13px;color:#fb7185;margin-bottom:10px">⚠ Errore caricamento dati</div>'
          + '<div style="font-size:10px;color:#64748b;margin-bottom:8px">' + err.message + '</div>'
          + '<div style="font-size:9px;color:#4a5568;line-height:1.6">Assicurarsi di aprire l\'app tramite HTTP<br>(GitHub Pages o server locale)<br>e non come file:// locale.</div>'
          + '</div>';
      }
      throw err;
    }
  })();
})();
