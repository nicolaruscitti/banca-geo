# CLAUDE.md — banca-geo dashboard

Dashboard geospaziale clienti bancari italiani. File principale: **`html/banca-geo.html`**.
Dipendenze esterne: Leaflet 1.9.4, Google Fonts (DM Mono / Instrument Serif / Sora), CartoDB tiles dark (no API key).

---

## 1. Dataset e Strutture Dati

### Sorgenti CSV (in `data/`)
| File | Righe | Contenuto |
|------|-------|-----------|
| `city_profile.csv` | 30 | Indici socioeconomici per città |
| `customers.csv` | 10.000 | Anagrafica clienti |
| `customers_with_city_id.csv` | 10.000 | Mapping cliente → città |
| `customer_history.csv` | ~8.000 | Storico stato civile 2021–2024 |
| `product_holdings.csv` | 28.527 | Prodotti per cliente |

### Caricamento runtime — `data/loader.js`
I dati NON sono embedded nell'HTML. Vengono letti via `fetch()` dai CSV a runtime.
`loader.js` espone `window._dataReady` (Promise). Il boot dell'app attende questa Promise prima di chiamare `initMap()` e `update()`.

Il loader mostra un overlay di caricamento con barra di progresso (`#loader-overlay`, `#loader-msg`, `#loader-bar`). Alla fine fa `fade-out` e rimuove l'overlay.

```js
// Struttura interna costruita da loader.js:

window.CITIES = [
  { id, name, reg, lat, lng, qi, di, rm, cl },
  // 30 elementi. Campi CSV: city_id, city_name, regione, lat, lng,
  // qualita_vita_index, digital_infrastructure_index, reddito_medio, costo_vita_index
];

window.CUSTOMERS = [
  [id, city_id, eta, stato, reddito_annuo, product_bitmask],
  // 10.000 tuple compatte, ordinate per id
  // stato: 0=Single 1=Coppia 2=Famiglia
  // product_bitmask: bit 0–6 (vedi tabella prodotti)
];

window.HISTORY = {
  "1": [[2021,0],[2022,0],[2023,1]],  // chiave=customer_id stringa, [anno,stato]
  // ~8.000 clienti con ≥2 snapshot
};
```

Colonna CSV prodotto: `prodotto` (non `product_name`). Il PROD_MAP in loader.js:
```js
const PROD_MAP = {
  'Conto Corrente': 0, 'Carta Debito': 1, 'Carta Credito': 2,
  'Mutuo': 3, 'Investimenti': 4, 'Assicurazione Vita': 5, 'Assicurazione Casa': 6
};
```

Il customer_history.csv ha colonne: `customer_id`, `anno`, `stato` (valori: Single/Coppia/Famiglia).

**Bitmask prodotti (bit 0–6):**
```
0=Conto Corrente  1=Carta Debito  2=Carta Credito  3=Mutuo
4=Investimenti    5=Ass.Vita      6=Ass.Casa
```
Verifica filtro: `products.every(p => pmask & (1 << p))`
Lista prodotti cliente: `for (let i=0; i<7; i++) if (pmask & (1<<i)) prods.push(i)`

---

## 2. Design System

### CSS Variables (dark theme — valori aggiornati)
```css
:root {
  --bg:#080d18; --s1:#0f1725; --s2:#172133; --s3:#20304a;
  --border:rgba(255,255,255,0.12); --border2:rgba(255,255,255,0.22);
  --accent:#4f8ef7; --accent2:#22d3c8;
  --txt:#e8edf8; --muted:#7e8fa4; --muted2:#9dafc4;
  --mono:'DM Mono',monospace;
}
```

### Layout
```css
html,body { height:100%; overflow:hidden; background:var(--bg); color:var(--txt); font-family:'Sora',sans-serif; }
.layout { display:grid; grid-template-columns:256px 1fr 340px; height:100vh; }
.map-wrap { position:relative; overflow:hidden; flex:1; min-height:0; }
#map { width:100%; height:100%; background:#0a0f1e; }
.leaflet-tile-pane { filter:brightness(1.5) saturate(0.9) hue-rotate(190deg); }
```
Tile: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`

### Colori
```js
const REG_COLORS = {"Nord Ovest":"#4f8ef7","Nord Est":"#a78bfa","Centro":"#34d399","Sud":"#fbbf24","Isole":"#fb7185"};
const STATUS_COLORS = ["#4f8ef7","#a78bfa","#34d399"]; // 0=Single 1=Coppia 2=Famiglia
const PROD_COLORS = ['#4f8ef7','#a78bfa','#22d3c8','#fbbf24','#34d399','#fb7185','#f97316'];
```

### Componenti CSS chiave
```css
/* Pill filtri */
.pill { padding:3px 9px; border-radius:20px; font-size:10px; font-family:var(--mono);
  cursor:pointer; border:1px solid var(--border2); background:var(--s2); color:var(--muted2); }
.pill.on { background:rgba(34,211,200,.1); border-color:var(--accent2); color:var(--accent2); }
.pill.s0.on { background:rgba(79,142,247,.1);  border-color:#4f8ef7; color:#4f8ef7; }
.pill.s1.on { background:rgba(167,139,250,.1); border-color:#a78bfa; color:#a78bfa; }
.pill.s2.on { background:rgba(52,211,153,.1);  border-color:#34d399; color:#34d399; }

/* City card */
.city-card { background:var(--s2); border:1px solid var(--border); border-radius:10px;
  padding:11px 13px; cursor:pointer; transition:border-color .18s,background .18s; margin-bottom:5px; }
.city-card.expanded   { background:rgba(79,142,247,.05); border-color:rgba(79,142,247,.28); }
.city-card.selected-city { box-shadow:0 0 0 1.5px var(--accent); border-color:var(--accent); }

/* Tooltip nome città (hover — modalità normale) */
.lf-city-tt { background:rgba(8,13,24,0.92)!important; border:1px solid rgba(34,211,200,0.35)!important;
  border-radius:5px!important; color:#22d3c8!important; font-family:'DM Mono',monospace!important;
  font-size:10px!important; padding:3px 9px!important; box-shadow:0 2px 10px rgba(0,0,0,0.55)!important;
  white-space:nowrap }
.lf-city-tt::before { display:none!important }

/* Popup Leaflet (click) */
.lf-popup .leaflet-popup-content-wrapper {
  background:rgba(8,13,24,0.97); border:1px solid rgba(79,142,247,0.35);
  border-radius:10px; box-shadow:0 4px 24px rgba(0,0,0,0.6); padding:0; }

/* Badge rischio churn */
.risk-badge { font-family:var(--mono); font-size:8px; padding:1px 6px; border-radius:3px;
  font-weight:500; display:inline-block; line-height:1.6; white-space:nowrap; }
.risk-hi  { background:rgba(251,113,133,.15); border:1px solid rgba(251,113,133,.3); color:#fb7185; }
.risk-med { background:rgba(251,191,36,.12);  border:1px solid rgba(251,191,36,.3);  color:#fbbf24; }
.risk-lo  { background:rgba(52,211,153,.1);   border:1px solid rgba(52,211,153,.25); color:#34d399; }

/* Pulsanti anni modal (ridotti) */
#cmod-year-btns .cmod-ctrl-btn { padding:2px 7px; font-size:8px; opacity:.65; border-radius:4px; }
#cmod-year-btns .cmod-ctrl-btn:hover { opacity:.9 }
#cmod-year-btns .cmod-ctrl-btn.cmod-active { opacity:1; background:rgba(79,142,247,.08);
  border-color:rgba(79,142,247,.35); color:var(--muted2); }
```

### Localizzazione italiana
```js
n.toLocaleString('it-IT')          // "10.000"
(v/1000).toFixed(1) + 'k'         // "28.1k"
Math.round(v) + '%'                // "45%"
v + ' a'                           // "45 a"
'€' + v.toLocaleString('it-IT')   // "€28.117"
```

---

## 3. Struttura File

```
banca-geo/
├── html/banca-geo.html             # file principale (unico da aprire)
├── data/
│   ├── loader.js                   # carica CSV a runtime, costruisce CITIES/CUSTOMERS/HISTORY
│   ├── revenues.js                 # cache lazy ricavi €/mese per cliente
│   ├── customer_emails.js          # template email per prodotto
│   ├── customer_satisfaction.js    # dati soddisfazione CUST_SATISFACTION[id]=[{score,note},...]
│   ├── report_data.js              # dati per export XLSX
│   ├── city_profile.csv            # 30 città
│   ├── customers.csv               # 10.000 clienti
│   ├── customers_with_city_id.csv  # mapping cliente→città
│   ├── customer_history.csv        # storico stato civile
│   └── product_holdings.csv        # prodotti per cliente
├── engine/
│   ├── correlation.js              # pearsonCorrelation, getAllFilteredCustomers, findSimilarProfiles
│   ├── extractors.js               # NLP: estrae prodotto/anni/età/segmenti/regioni/città/reddito
│   ├── intent.js                   # detectIntent v8 — 7 tipi (+ fallback)
│   ├── crosssell.js                # queryCrossSell — bucketing demografico
│   ├── projection.js               # queryProjection — Markov chain
│   ├── churn.js                    # computeChurnScore, queryChurn — rischio abbandono
│   ├── waterfall.js                # getEligibleProducts, getCityWaterfall, queryWaterfall
│   ├── demographic.js              # queryDemographic
│   ├── gap.js                      # queryGap
│   ├── customer.js                 # queryCustomer — analisi singolo cliente
│   ├── response.js                 # generateResponse → {text, actions, aiResult}
│   ├── mail.js                     # sendMail — template email per prodotto
│   └── engine.js                   # sendChat dispatcher, stato analysisMode globale
└── ui/
    ├── map.js                      # initMap, renderMarkers, renderAnalysisMarkers,
    │                               #   showCityView, showCustomers
    ├── panel.js                    # aggregate, getCityCustomers, renderCityList,
    │                               #   renderCustomerList, renderAnalysisPanel,
    │                               #   applyActions, update, renderAiPanel, closeAiPanel
    ├── citymodal.js                # openCityModal: istogrammi Canvas 2D, churn, waterfall,
    │                               #   proiezioni, strategia
    ├── chat.js                     # handleChat, resetChat, toggleChat, md, esc, addMsg
    └── report.js                   # export XLSX, generateReportScostamenti,
                                    #   generateReportOpinioni, selezione città
```

### Ordine inclusione script (RISPETTARE OBBLIGATORIAMENTE)
```html
<!-- Nel <head>: -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<!-- Google Fonts: DM Mono 300/400/500, Instrument Serif, Sora 300/400/600 -->

<!-- In fondo al <body>, PRIMA dello script inline: -->
<script src="../data/customer_emails.js"></script>
<script src="../data/revenues.js"></script>
<script src="../engine/correlation.js"></script>
<script src="../engine/extractors.js"></script>
<script src="../engine/intent.js"></script>
<script src="../engine/crosssell.js"></script>
<script src="../engine/projection.js"></script>
<script src="../engine/churn.js"></script>
<script src="../engine/waterfall.js"></script>
<script src="../engine/demographic.js"></script>
<script src="../engine/gap.js"></script>
<script src="../engine/customer.js"></script>
<script src="../engine/response.js"></script>
<script src="../engine/mail.js"></script>
<script src="../engine/engine.js"></script>
<script src="../ui/map.js"></script>
<script src="../data/customer_satisfaction.js"></script>
<script src="../ui/panel.js"></script>
<script src="../ui/citymodal.js"></script>
<script src="../ui/chat.js"></script>
<script src="../data/report_data.js"></script>
<script src="../ui/report.js"></script>
<script src="../data/loader.js"></script>   <!-- SEMPRE ULTIMO: attende i CSV, poi avvia l'app -->

<!-- Script inline dopo loader.js: costanti + stato globale + event listeners + boot -->
<script>
const TX = {};  // oggetto transazioni (placeholder)
const PRODUCTS      = ["Conto Corrente","Carta Debito","Carta Credito","Mutuo","Investimenti","Assicurazione Vita","Assicurazione Casa"];
const PSHORT        = ["C/C","Deb","Cred","Mutuo","Inv","Ass.V","Ass.C"];
const STATUS_LABELS = ["Single","Coppia","Famiglia"];
const STATUS_COLORS = ["#4f8ef7","#a78bfa","#34d399"];
const REG_COLORS    = {"Nord Ovest":"#4f8ef7","Nord Est":"#a78bfa","Centro":"#34d399","Sud":"#fbbf24","Isole":"#fb7185"};
const REGIONS       = ["Tutte","Nord Ovest","Nord Est","Centro","Sud","Isole"];
const CITY_SORT     = [{k:"count",l:"Clienti"},{k:"avgIncome",l:"Reddito"},{k:"avgAge",l:"Età"},{k:"qi",l:"Q.Vita"},{k:"di",l:"Digital"}];
const CUST_SORT     = [{k:"eta",l:"Età"},{k:"reddito",l:"Reddito"},{k:"id",l:"ID"}];

// Boot: attende loader.js prima di inizializzare mappa e UI
window._dataReady.then(() => { initMap(); update(); });
</script>
```

---

## 4. Architettura JS — Regole Critiche

### Stato globale (script inline nell'HTML)
```js
let F = { ageMin:18, ageMax:79, incomeMin:8000, incomeMax:77000, statuses:[], products:[] };
let citySort="count", citySortDir="desc", regFilter="Tutte", citySearch="";
let custSort="reddito", custSortDir="desc", custSearch="";
let selectedCityId=null, expandedCityId=null;
let cityAgg={};
let leafletMap=null, markerLayer=null;
let aiCities=new Set();
let aiCustomers=new Map();
let aiCityMeta=new Map();
let lastAiResult=null;
// In engine.js:
let analysisMode=false, analysisResults=null, selectedAnalysisCity=null;
// In panel.js:
let mailFilterActive=false;
```

### ⚠️ REGOLE CRITICHE COMPORTAMENTALI

**1. Click su marker in modalità normale → SEMPRE vista città + card espansa. MAI apertura automatica vista clienti.**
```js
circle.on('click', e => {
  e.originalEvent.stopPropagation();
  if (document.getElementById('view-customers').style.display !== 'none') showCityView();
  selectedCityId = city.id; expandedCityId = city.id;
  renderMarkers(); renderCityList();
  setTimeout(() => document.querySelector(`[data-city-id="${city.id}"]`)
    ?.scrollIntoView({behavior:'smooth',block:'nearest'}), 60);
});
```

**2. `showCustomers()` in modalità normale: chiamato SOLO dal bottone "Vedi N clienti →" nella card espansa (via `onclick="event.stopPropagation();analysisMode=false;showCustomers(cityId)"`).**

**3. In modalità analisi: click su marker waterfall/churn chiama `renderAnalysisPanel()`, click su marker crosssell chiama `showCustomers(cityId)`, click su marker customer chiama `renderAnalysisPanel()`.**

**4. `update()` non cambia mai vista:**
```js
function update() {
  aggregate(); renderMarkers();
  if (document.getElementById('view-customers').style.display !== 'none') {
    if (selectedCityId && cityAgg[selectedCityId]) renderCustomerList();
    else showCityView();
  } else renderCityList();
}
```

**5. Le due viste usano `display:flex` / `display:none` (NON visibility:hidden).**

**6. Popup hover in modalità analisi waterfall/churn: usare `mouseover`/`mouseout` + `L.popup().openOn(leafletMap)` — NON `bindPopup`. Motivo: `clearLayers()` distrugge il circle e il suo `bindPopup` prima del render.**

**7. Label waterfall (`iconSize:[0,0]` obbligatorio per non generare offset):**
```js
L.marker([city.lat, city.lng], {
  icon: L.divIcon({
    className:'',
    html: '<div style="...white-space:nowrap;transform:translateX(-50%)">' + gapLbl + '</div>',
    iconSize:[0,0], iconAnchor:[0,0]
  }),
  interactive:false, zIndexOffset:1000
}).addTo(markerLayer);
```

### Funzioni principali

**`aggregate()`** — scansiona CUSTOMERS, applica filtri F, costruisce `cityAgg`:
```js
cityAgg[c.id] = { ...c, count, avgIncome, avgAge, statuses:[s,c,f], products:[p0..p6],
                  penetration: products.map(v => Math.round(v/count*100)) }
```

**`renderMarkers()`** — se `analysisMode`, delega a `renderAnalysisMarkers()`. Altrimenti:
- Raggio: `r = 10 + (city.count/maxC)*28` (10–38px)
- Label: `count >= 1000` → `"1.2k"`. Colore: `REG_COLORS[city.reg]`, se `aiCities.has(id)` → `#a78bfa`
- `bindTooltip(city.name, {className:'lf-city-tt', direction:'top'})` → nome al hover
- `bindPopup(...)` → click: popup con nome, regione, 4 KPI, barra stato civile, pill prodotti

**`showCityView()`** — `view-cities:flex`, `view-customers:none`, `selectedCityId=null`, `selectedAnalysisCity=null`, re-render.

**`showCustomers(cityId)`** — `view-cities:none`, `view-customers:flex`, aggiorna `#cust-city-name/#cust-city-reg`, `back-btn` testo = `analysisMode ? '← Risultati' : '← Città'`, chiama `renderCustomerList()`. Resetta `mailFilterActive`.

**`renderCustomerList()`** — virtual slice max 200 righe (+ nota "+ N altri..."). KPI: reddito medio, età media, % single, prodotti medi. In modalità churn: usa `byCityId[cityId].custs`. In modalità crosssell: deduplicazione per id (correlazione più alta).

**`renderCityList()`** — in `analysisMode` delega a `renderAnalysisPanel()`. Card espansa mostra: barra stato civile, legenda %, heatmap prodotti (7 pill opacità variabile), 4 metriche extra, mini-waterfall gap, bottone "Vedi N clienti →".

**Click su card** — espande/chiude senza navigare. Il bottone "Vedi N clienti →" usa `onclick="event.stopPropagation();analysisMode=false;showCustomers(cityId)"`.

**Click su mappa vuota** → `selectedCityId=null; expandedCityId=null; renderMarkers(); renderCityList();`

---

## 5. revenues.js — Ricavi €/mese per cliente

Cache lazy (NON inizializzare al load — dipende da CUSTOMERS caricato da loader.js).
`_buildRevenueCache()` popola `CUSTOMER_REVENUES[id][productIndex]`.

```
t = (reddito - 8000) / 69000     // normalizzato 0..1
a = (eta - 18) / 61              // normalizzato 0..1

0 C/C          → €8  (fisso)
1 Carta Debito → €2  (fisso)
2 Carta Credito→ €12 (fisso)
3 Mutuo        → round(300 + t×700)   // €300–1.000 ↑ reddito
4 Investimenti → round(10  + t×40)    // €10–50     ↑ reddito
5 Ass.Vita     → round(50  − a×42)    // €50–8      ↓ età
6 Ass.Casa     → round(15  + t×65)    // €15–80     ↑ reddito
```

API: `getRevenue(customerId, productIndex)` / `getCustomerTotalRevenue(customerId, pmask)`

---

## 6. Engine AI

### detectIntent v8 — priorità (prima match vince)
1. `extractCustomerId(q)` → `{type:'customer', customerId}`
2. Regex proiezione → `{type:'projection', years, cityId, statuses, incomeRange, ageFilter}`
3. **Regex waterfall** (prima di gap per evitare collisione su "gap") → `{type:'waterfall', cityId, ...}`
4. Regex gap → `{type:'gap', ageRange, cityId, statuses, incomeRange}`
5. **Regex churn** → `{type:'churn', cityId, statuses, incomeRange, ageFilter}`
6. Regex cross-sell (pattern v8 ampio: proposta, candidati, suggerisci, ecc.) → `{type:'crosssell', product, ...}`
7. Regex demografico → `{type:'demographic', segments, regions, cityId, incomeRange, ageFilter}`
8. Fallback prodotto rilevato → `{type:'crosssell', product}`
9. Fallback fascia età → `{type:'gap', ageRange}`
10. `{type:'general'}`

### queryCrossSell — bucketing
```js
key = stato + '_' + Math.floor(eta/10) + '_' + Math.floor(reddito/15000)
// Soglia THRESH=20%: bucket ≥4 clienti E penetrazione prodotto ≥20%
// → clienti del bucket SENZA il prodotto = candidati
// Output: { candidates:[{id,eta,stato,reddito,pmask,product,correlation,similarCount},...], byCityId:{}, n }
// candidates.slice(0,200) — cap a 200 candidati totali
```

### queryProjection — Markov chain
Tassi di transizione (da HISTORY, periodo completo → annualizzati con radice cubica):
```js
aS2C = 1 - (1 - rS2C)**(1/3)  // analoghe aS2F, aC2F
// Fallback se no HISTORY: rS2C=0.05, rS2F=0.02, rC2F=0.04
```
Iterazione annuale: `fS -= dS2C+dS2F; fC += dS2C-dC2F; fF += dS2F+dC2F`

Penetrazione futura: `futPct[p] = (fS×sPct[0][p] + fC×sPct[1][p] + fF×sPct[2][p]) / fTot`

### queryChurn — scoring rischio abbandono
Quattro fattori di rischio (punteggio 0–100):

| Fattore | Punti | Condizione |
|---------|-------|------------|
| Profondità prodotti | 0–40 | 1→40pt, 2→27pt, 3→13pt, 4+→0pt — formula: `max(0, round(40*(1-min(prodCount-1,3)/3)))` |
| Nessun prodotto premium | 25 | nessun bit 3-6 (Mutuo/Inv/Vita/Casa), cioè `!(pmask & 0b1111000)` |
| Transizione stato negativa | 25 | Famiglia→Coppia o Coppia→Single in HISTORY |
| Reddito sotto soglia | 10 | `reddito < city.rm * 0.55` |

Soglie: Alto ≥60 / Medio ≥30 / Basso <30

Output `queryChurn()`: `{ customers, byCityId, n, avgScore, totalHigh }`
`byCityId[cityId] = { avgScore, highRisk, medRisk, count, custs:[{id,eta,stato,reddito,pmask,cityId,score,reasons},...] }`

### queryWaterfall — gap di ricavo per prodotto
Eleggibilità prodotti (`getEligibleProducts(eta, stato, reddito)`):

| Prodotto | Condizione |
|----------|-----------|
| C/C, Carta Debito | tutti |
| Carta Credito | `reddito >= 15000` |
| Mutuo | `stato===1 o 2`, età 25–58, `reddito >= 22000` |
| Investimenti | `reddito >= 28000` |
| Ass. Vita | `stato===1 o 2` oppure `eta >= 35` |
| Ass. Casa | `stato===1 o 2` |

`getCityWaterfall(cityId)` → `{ products[7], n, totalActual, totalEligible, totalGap, captureRate }`
`products[i]` = `{ i, name, actual, eligible, gap, actualN, eligibleN, captureRate }`

`queryWaterfall()` → `{ cities:[{cityId,name,reg,actual,eligible,gap,captureRate,count},...], totalActual, totalGap, n }` ordinato per gap discendente.

### Modalità analisi sulla mappa (analysisMode=true)
`renderAnalysisMarkers()` sostituisce `renderMarkers()` — 5 comportamenti:

| Tipo | Colore marker | Label | Dimensione | Hover | Click |
|------|--------------|-------|------------|-------|-------|
| `customer` | bianco + bordo cyan | nessuna | r=22 fisso | `bindPopup` (ok: no clearLayers nel click) | `renderAnalysisPanel()` |
| `crosssell` | viola `#a78bfa` | n candidati | ∝ candidati | nessuno | `showCustomers(cityId)` |
| `waterfall` | cyan `#22d3c8` | `€Xk` gap | ∝ gap € | popup mouseover/mouseout (4 KPI) | `renderAnalysisPanel()` |
| `churn` | rosso/arancione/giallo ∝ avgScore | n alto rischio | ∝ highRisk | popup mouseover/mouseout (barra distribuzione + 3 stat) | `renderAnalysisPanel()` |
| `gap/demographic/projection` | cyan `#22d3c8` | nessuna | ∝ count | nessuno | `renderAnalysisPanel()` |

Colore churn: `avgScore >= 60` → `#fb7185`, `>= 45` → `#f97316`, else → `#fbbf24`.
Marker non selezionati: grigi semi-trasparenti (fillOpacity 0.1, opacity 0.2).
Marker selezionato (`selectedAnalysisCity===city.id`): bordo bianco, fillOpacity 0.92, +3px raggio.

---

## 7. Pannello Analisi (`ui/panel.js`)

### `renderAnalysisPanel()`
Chiamato da `renderCityList()` quando `analysisMode=true`.
- Se `selectedAnalysisCity` è valorizzato → delega a `renderAnalysisCityDetail(cityId)`
- Altrimenti mostra lista risultati nel `#city-list` con header tipo + pulsante ✕ che chiama `closeAiPanel()`

Tipi di lista risultati:
- **crosssell**: summary candidati + righe città ordinate per n candidati, click → `showCustomers(cid)`
- **churn**: summary alto rischio + righe città ordinate per highRisk, click → `selectedAnalysisCity=cid; renderAnalysisPanel()`
- **waterfall**: summary gap totale + righe città ordinate per gap, click → `selectedAnalysisCity=cid; renderAnalysisPanel()`
- **customer**: card profilo + opportunità cross-sell
- **gap/projection/demographic**: tabelle specifiche

### `renderAiPanel(data)` / `closeAiPanel()`
Pannello `#ai-panel` (posizionato sopra la lista città, `display:none` di default). Mostra sommario analisi crosssell con righe città cliccabili. `closeAiPanel()` nasconde e chiama `applyActions([])` se analysisMode.

### `applyActions(acts, aiResultData)`
Popola lo stato globale per la modalità analisi:
- `highlight_cities` → `aiCities.add(id)`, `aiCityMeta.set(id, meta)`
- `highlight_customers` → `aiCustomers.set(cityId, Map<id, {suggest, reason, correlation}>)`, `aiCities.add`
- `highlight_churn` → `aiCustomers.set(cityId, Map<id, {churnScore, reasons}>)`, `aiCities.add`
- `waterfall_data` → dati già in `analysisResults`, nessuna struttura aggiuntiva
- `prediction` → mostrato nel pannello analisi, nessun overlay mappa

---

## 8. Modal Città (`ui/citymodal.js`)

Aperto da click sul pulsante **⊞** della city card in `renderCityList()` → `openCityModal(cityId)`.

Struttura DOM (overlay fisso, backdrop blur, width 640px):
- Header: nome città (Instrument Serif, cyan), regione + n clienti, pulsante ×
- Barra controlli: toggle vista (Prodotti / Redditività / ⚠ Rischio / Waterfall), toggle anni (Attuale/+2/+5/+10) — bottoni anni ridotti e con opacity .65
- `#cmod-canvas-wrap` → `<canvas id="cmod-canvas">` (height=200, width=clientWidth via requestAnimationFrame)
- `#cmod-diff` (tabella Δ, `display:none` quando `_mcYear===0`)
- `#cmod-strat-hd` (collassabile) + `#cmod-strat-body`

**4 viste del modal** (`_mcView`):
- `'prod'`: istogramma penetrazione % per prodotto
- `'rev'`: istogramma redditività €/cliente per prodotto
- `'churn'`: vista rischio abbandono (bypass canvas — render HTML diretto). Anno-btns nascosti (`visibility:hidden`).
- `'waterfall'`: vista gap ricavi (bypass canvas — render HTML diretto). Anno-btns nascosti.

### Istogramma Canvas 2D — `_mcDrawHist(data, ref, isFut)`
Padding: `PL=48, PR=12, PT=26, PB=52`. `barW = floor((W-PL-PR)/7) - 5`.
5 linee griglia orizzontali. Barra ghost (ref) = `rgba(255,255,255,0.07)`. Delta label sopra barra: verde `#34d399` / rosso `#fb7185`.

### Tabella diff — `_mcRenderDiff(cur, fut)`
```js
dTotRev = sum(fut.totalRev) - sum(cur.totalRev)
dp[i] = (fut.penetration[i] - cur.penetration[i]) × 100   // %
dr[i] =  fut.revPerCust[i]  - cur.revPerCust[i]            // €/cliente
```

### Strategia — `_mcRenderStrat(city, custs, cur)`
Top 3 opportunità: `score = (1 - penetrazione) × avgRev` → sort desc → slice(0,3)

Piano d'azione (prima condizione soddisfatta):
1. `topOpp.penet < 35%` → campagna attivazione
2. `avgInc > 33k && mutuo.penet < 20%` → target Mutuo fascia alta
3. `avgAge < 42 && assVita.penet < 30%` → segmento giovane, alto margine Ass.Vita
4. `inv.penet < 20% && avgInc > 28k` → Investimenti su reddito buono
5. Fallback → "Consolidare con cross-sell su {opps[1].name}"

---

## 9. Sidebar Sinistra — Sezioni Campagne e Report

La sidebar ha tre sezioni collassabili in fondo, dopo i filtri e la legenda regioni:

### Sezione Campagne (`.campagne-wrap`)
Toggle via `toggleCampagne()`. Altezza fissa `#campagne-body: 64px`.

**Link "Nuova Campagna"** → `openCampModal()`
**Link "Archivio Campagne"** → `openArchModal()`

### Sezione Report (`.report-wrap`)
Toggle via `toggleReport()`. Altezza fissa `#report-body: 116px`.

**Link "Analisi degli scostamenti"** → `generateReportScostamenti()` (export XLSX globale)
**Link "Analisi degli scostamenti - città"** → `openCitySelModal()` (poi `generateReportScostamentiCitta()`)
**Link "Opinione generale dei clienti"** → `generateReportOpinioni()` (export XLSX soddisfazione)

---

## 10. Modali dell'Applicazione

Tutti i modali usano `position:fixed; inset:0; z-index:N; backdrop-filter:blur(4px)`.
`display:none` a riposo, `display:flex` quando aperti.

### Modal Nuova Campagna (`#camp-overlay`, z=3000, width 480px)
Campi form:
- **Periodo**: date-start (`#camp-date-start`), date-end (`#camp-date-end`)
- **Prodotto**: radio (Carta di Credito=2, Mutuo=3, Investimento=4, Ass. Vita=5, Ass. Casa=6)
- **Clienti**: radio (Tutti / Regione → sottomenu regioni / Città → `<select>` città)
- **Tipo evento**: radio (Sport, Moda, Design, Food, Altro) + campo nome evento

Stato sincronizzato in `_campForm` via `_campSync()`.
Bottone "Mostra Anteprima" → `openPrevModal()`.

### Modal Anteprima Campagna (`#prev-overlay`, z=3100, width 580px)
Mostra: Periodo di validità, Prodotto, Destinatari (da `_campForm`), corpo email editabile (`contenteditable`).
Corpo email generato da `customer_emails.js` via `buildEmailHtml(_campForm)`.
Bottone "Invia Campagna" → `sendCampagna()` → salva in archivio localStorage, mostra `#conf-overlay`.

### Modal Conferma Invio (`#conf-overlay`, z=3300, width 340px)
Overlay semplice con check verde e messaggio. Bottone "OK" → `confirmSent()` → chiude tutto.

### Modal Archivio Campagne (`#arch-overlay`, z=3000, width 720px)
Legge da localStorage (`CAMPAGNE_ARCHIVIO`).
Filtri: Da/A (date), Prodotto, Cliente (Tutti/Regione/Città), Genere (Sport/Moda/Design/Food/Altro).
Ogni record: data invio, prodotto, periodo, destinatari, evento. Azioni: 🗑 elimina → `#del-overlay`, 📋 dettaglio → `#det-overlay`.

### Modal Conferma Eliminazione (`#del-overlay`, z=3250)
Semplice confirm dialog. Bottone "OK" → `confirmDel()`.

### Modal Dettaglio Campagna (`#det-overlay`, z=3150, width 580px)
Mostra tutti i dati + corpo email originale (read-only).

### Modal Selezione Città Report (`#csel-overlay`, z=3000, width 440px)
Lista città con checkbox, ricerca, sommario selezione. Bottone "Report" (disabilitato se nessuna selezione) → `generateReportScostamentiCitta()`.

---

## 11. Chat (`ui/chat.js`)

Funzioni principali:
- `handleChat()` — legge input, chiama `sendChat(q)`, poi `applyActions(resp.actions, resp.aiResult)`
- `resetChat()` — ripristina chat al messaggio di benvenuto, mostra i suggerimenti, resetta `analysisMode`
- `toggleChat()` — collassa/espande `#chat-body` (classe `chat-collapsed`)
- `toggleReport()` — collassa/espande `#report-body` (classe `report-collapsed`)
- `toggleCampagne()` — collassa/espande `#campagne-body` (classe `campagne-collapsed`)
- `toggleRisultati()` — collassa/espande `#risultati-body` (classe `risultati-collapsed`)
- `md(t)` — mini-markdown: **bold**, `code`, `\n\n`→paragrafo, `\n•`→bullet
- `esc(t)` — escape HTML
- `addMsg(role, html, id)` — aggiunge messaggio alla chat

**Suggerimenti predefiniti** (visibili all'avvio):
- "Chi può ricevere proposta Investimenti?" (viola)
- "Proiezione distribuzione 5 anni" (viola)
- "Gap prodotti fascia 30-45 anni" (viola)
- "Confronto single e coppie in Nord Italia" (viola)
- "Analizza il cliente #42" (viola)
- "⚠ Clienti a rischio" (rosso `#fb7185`)
- "Revenue Waterfall" con icona SVG inline (cyan `#22d3c8`)

---

## 12. Loader Overlay

```html
<div id="loader-overlay" style="position:fixed;inset:0;background:#080d18;z-index:9999;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px">
  <div style="font-family:'DM Mono',monospace;font-size:10px;color:#22d3c8;
    letter-spacing:.2em;text-transform:uppercase">Banca-Geo</div>
  <div id="loader-msg" style="font-family:'DM Mono',monospace;font-size:10px;color:#64748b">
    Caricamento dati in corso…</div>
  <div style="width:200px;height:2px;background:rgba(255,255,255,.07);border-radius:1px;overflow:hidden">
    <div id="loader-bar" style="height:100%;width:0%;background:#22d3c8;
      border-radius:1px;transition:width .25s ease"></div>
  </div>
</div>
```

`loader.js` aggiorna `#loader-msg` e `#loader-bar` via `setLoader(msg, pct)` durante il caricamento (5% → 30% → 52% → 78% → 96%). In caso di errore mostra messaggio di errore nell'overlay senza nasconderlo.

**L'applicazione non può funzionare aprendo `html/banca-geo.html` come file locale** (`file://`): i `fetch()` verso i CSV falliscono per CORS. Serve HTTP: GitHub Pages, un server locale (es. `python -m http.server`), o VS Code Live Server.

---

## 13. Checklist Implementazione

### Base
- [ ] Leaflet 1.9.4 CSS + JS da unpkg; Google Fonts (DM Mono 300/400/500, Instrument Serif, Sora 300/400/600)
- [ ] Grid 3 colonne (256px | 1fr | 340px), height:100vh, overflow:hidden
- [ ] `data/loader.js` che legge i 5 CSV via `fetch()`, costruisce CITIES/CUSTOMERS/HISTORY, espone `window._dataReady`
- [ ] `#loader-overlay` con barra di progresso, fade-out al completamento, messaggio di errore se fetch fallisce
- [ ] Boot: `window._dataReady.then(() => { initMap(); update(); })`
- [ ] PRODUCTS, PSHORT, STATUS_LABELS, STATUS_COLORS, REG_COLORS, REGIONS embedded nello script inline
- [ ] `aggregate()` con filtro bitmask (`products.every(p => pmask & (1<<p))`)
- [ ] `renderMarkers()` raggio 10–38px, click → card espansa (NON vista clienti), tooltip nome città
- [ ] `showCustomers()` chiamato SOLO dal bottone "Vedi N clienti →" (o da crosssell click in analisi)
- [ ] `update()` che non forza mai cambio vista
- [ ] Slice max 200 clienti + nota "+ N altri"

### Analisi AI
- [ ] Script caricati nell'ordine esatto della sezione 3 (`loader.js` SEMPRE ULTIMO)
- [ ] `revenues.js`: cache lazy `_buildRevenueCache()`, formule corrette per tutti 7 prodotti
- [ ] `engine/intent.js`: priorità waterfall PRIMA di gap (evita collisione su "gap di cattura")
- [ ] `engine/churn.js`: 4 fattori, soglie Alto≥60/Medio≥30, `byCityId` con `custs` array
- [ ] `engine/waterfall.js`: `getEligibleProducts()`, `getCityWaterfall()`, `queryWaterfall()`
- [ ] `ui/map.js`: popup hover waterfall/churn con `mouseover`/`mouseout` (non `bindPopup`)
- [ ] `ui/map.js`: label waterfall con `iconSize:[0,0]` e `white-space:nowrap`
- [ ] CSS: `.lf-city-tt` con `!important` overrides, `::before{display:none!important}`
- [ ] CSS: `.risk-badge`, `.risk-hi/.risk-med/.risk-lo`
- [ ] CSS: `#cmod-year-btns .cmod-ctrl-btn` ridotti (8px, opacity .65)

### Modal e funzionalità avanzate
- [ ] City modal `#cmod-overlay`: 4 viste (prod/rev/churn/waterfall), canvas ridimensionato a rAF
- [ ] Vista churn e waterfall nel modal: bypass canvas, anno-btns nascosti (`visibility:hidden`)
- [ ] Campagne: modal nuova campagna, anteprima, conferma invio, archivio (localStorage), dettaglio, eliminazione
- [ ] Report: export XLSX scostamenti, selezione città (`#csel-overlay`), report opinioni
- [ ] Sezioni sidebar collassabili: Campagne (64px), Report (116px)
- [ ] Mail filter button `✉` nella vista clienti: visibile solo in modalità crosssell

### Test
- [ ] Click marker → city card espansa (non vista clienti)
- [ ] "Vedi N clienti →" → vista clienti
- [ ] "Revenue Waterfall" chat → marker cyan con label €Xk; hover → popup 4 KPI; click → dettaglio prodotti
- [ ] "Clienti a Rischio" chat → marker colorati per score; hover → popup barra distribuzione; click → dettaglio churn
- [ ] "cross-sell Mutuo" → marker viola; "proiezione 5 anni" → delta testo; "cliente #42" → marker bianco
- [ ] Tooltip nome città al passaggio mouse in modalità normale
- [ ] Apertura `html/banca-geo.html` tramite HTTP mostra loader → poi app funzionante
- [ ] Apertura come `file://` mostra messaggio di errore nell'overlay
