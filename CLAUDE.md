# CLAUDE.md — banca-geo dashboard

Dashboard geospaziale clienti bancari italiani. Versione corrente: **`html/banca-geo.html`**.
**Versioning:** ogni modifica aggiorna `html/banca-geo.html` (file unico, non versionato).
Dipendenze esterne: Leaflet 1.9.4, Google Fonts (DM Mono / Instrument Serif / Sora), CartoDB tiles dark (no API key).

---

## 1. Dataset e Strutture Dati

### Sorgenti CSV (in `data/`)
| File | Righe | Contenuto |
|------|-------|-----------|
| `city_profile.csv` | 30 | Indici socioeconomici per città |
| `customers.csv` | 10.000 | Anagrafica clienti |
| `customers_with_city_id.csv` | 10.000 | Mapping cliente→città |
| `customer_history.csv` | 8.000 | Storico stato civile 2021–2024 |
| `product_holdings.csv` | 28.527 | Prodotti per cliente |
| `transactions_monthly.csv` | 600.000 | Transazioni 2021–2025 |

### CITIES — embedded inline nell'HTML
```js
const CITIES = [
  {"id":1,"name":"Milano","reg":"Nord Ovest","lat":45.4654,"lng":9.1866,
   "qi":84.5,"di":73.0,"rm":28117,"cl":100.4},
  // ... 30 città. Campi: id(1-30), name, reg(5 regioni), lat/lng, qi, di, rm, cl
  // x/y sono legacy SVG — non usati nella versione Leaflet
];
```

### CUSTOMERS — tuple compatte, embedded inline
```js
const CUSTOMERS = [
  [id, city_id, eta, stato, reddito_annuo, product_bitmask],
  // eta: 18-79 | stato: 0=Single 1=Coppia 2=Famiglia | reddito: 8000-77000
];
```

**Bitmask prodotti (bit 0–6):**
```
0=Conto Corrente  1=Carta Debito  2=Carta Credito  3=Mutuo
4=Investimenti    5=Ass.Vita      6=Ass.Casa
```
Verifica filtro: `products.every(p => pmask & (1 << p))`
Lista prodotti cliente: `for (let i=0; i<7; i++) if (pmask & (1<<i)) prods.push(i)`

### HISTORY — embedded inline nell'HTML
```js
const HISTORY = {
  "1": [[2021,0],[2022,0],[2023,1]],  // chiave=customer_id stringa, [anno,stato]
  // ~8.000 clienti con ≥2 snapshot
};
```
Usato da `projection.js` e `citymodal.js` per calibrare le transizioni Markov.
Usato da `churn.js` per rilevare transizioni di stato civile negative.

### Script Python per generare CITIES + CUSTOMERS
```python
import csv, json
from collections import defaultdict

cities = []
with open('city_profile.csv') as f:
    for row in csv.DictReader(f):
        cities.append({"id":int(row["city_id"]),"name":row["nome"],"reg":row["regione"],
            "lat":float(row["lat"]),"lng":float(row["lng"]),"qi":float(row.get("qualita_vita",0)),
            "di":float(row.get("digital_index",0)),"rm":int(row.get("reddito_mercato",0)),
            "cl":float(row.get("costo_vita",0))})

cust_city = {}
with open('customers_with_city_id.csv') as f:
    for row in csv.DictReader(f): cust_city[int(row["customer_id"])] = int(row["city_id"])

PROD_MAP = {"Conto Corrente":0,"Carta Debito":1,"Carta Credito":2,"Mutuo":3,
            "Investimenti":4,"Assicurazione Vita":5,"Assicurazione Casa":6}
prod_mask = defaultdict(int)
with open('product_holdings.csv') as f:
    for row in csv.DictReader(f):
        cid = int(row["customer_id"])
        if row["product_name"] in PROD_MAP: prod_mask[cid] |= (1 << PROD_MAP[row["product_name"]])

customers = []
with open('customers.csv') as f:
    SM = {"Single":0,"Coppia":1,"Famiglia":2}
    for row in csv.DictReader(f):
        cid = int(row["customer_id"])
        customers.append([cid, cust_city.get(cid,0), int(row["eta"]),
            SM.get(row["stato_familiare"],0), int(float(row["reddito_annuo"])), prod_mask.get(cid,0)])
customers.sort(key=lambda x: x[0])
```

### Script Python per HISTORY
```python
history = defaultdict(list)
with open('customer_history.csv') as f:
    SM = {'Single':0,'Coppia':1,'Famiglia':2}
    for row in csv.DictReader(f):
        history[str(int(row['customer_id']))].append([int(row['anno']), SM.get(row['stato_familiare'],0)])
history = {k: sorted(v) for k,v in history.items() if len(v) >= 2}
```

---

## 2. Design System

### CSS Variables (dark theme)
```css
:root {
  --bg:#080d18; --s1:#0f1523; --s2:#161e30; --s3:#1c2740;
  --border:rgba(255,255,255,0.07); --border2:rgba(255,255,255,0.14);
  --accent:#4f8ef7; --accent2:#22d3c8;
  --txt:#dde4f0; --muted:#4a5568; --muted2:#64748b;
  --mono:'DM Mono',monospace;
}
```

### Layout
```css
html,body { height:100%; overflow:hidden; }
.layout { display:grid; grid-template-columns:256px 1fr 340px; height:100vh; }
.map-wrap { position:relative; overflow:hidden; }
#map { width:100%; height:100%; background:#0a0f1e; }
.leaflet-tile-pane { filter:brightness(0.55) saturate(0.3) hue-rotate(190deg); }
```
Tile: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`

### Colori
```js
const REG_COLORS = {"Nord Ovest":"#4f8ef7","Nord Est":"#a78bfa","Centro":"#34d399","Sud":"#fbbf24","Isole":"#fb7185"};
const STATUS_COLORS = ["#4f8ef7","#a78bfa","#34d399"]; // 0=Single 1=Coppia 2=Famiglia
const PROD_COLORS = ['#4f8ef7','#a78bfa','#22d3c8','#fbbf24','#34d399','#fb7185','#f97316'];
```

Colori analisi AI:
```
crosssell    → viola  #a78bfa
waterfall    → cyan   #22d3c8
gap          → rosso  #fb7185
churn alto   → rosso  #fb7185
churn medio  → arancione #f97316
churn basso  → giallo #fbbf24
demographic  → giallo #fbbf24
projection   → cyan   #22d3c8
customer     → accent #4f8ef7
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

/* Popup Leaflet (click) */
.lf-popup .leaflet-popup-content-wrapper {
  background:rgba(8,13,24,0.97); border:1px solid rgba(79,142,247,0.35);
  border-radius:10px; box-shadow:0 4px 24px rgba(0,0,0,0.6); padding:0; }

/* Tooltip nome città (hover modalità normale) */
.lf-city-tt { background:rgba(8,13,24,0.92)!important; border:1px solid rgba(34,211,200,0.35)!important;
  border-radius:5px!important; color:#22d3c8!important; font-family:'DM Mono',monospace!important;
  font-size:10px!important; padding:3px 9px!important; box-shadow:0 2px 10px rgba(0,0,0,0.55)!important;
  white-space:nowrap }
.lf-city-tt::before { display:none!important }

/* Badge rischio churn */
.risk-badge { padding:2px 6px; border-radius:10px; font-family:var(--mono); font-size:9px; font-weight:500; }
.risk-hi  { background:rgba(251,113,133,.12); border:1px solid #fb7185; color:#fb7185; }
.risk-med { background:rgba(249,115,22,.12);  border:1px solid #f97316; color:#f97316; }
.risk-lo  { background:rgba(251,191,36,.12);  border:1px solid #fbbf24; color:#fbbf24; }

/* Pulsanti anni modal (secondari/ridotti) */
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

## 3. Struttura File (v33)

```
banca-geo/
├── html/banca-geo_33.html          # file principale corrente
├── data/
│   ├── revenues.js                 # cache lazy ricavi €/mese per cliente
│   ├── customer_emails.js          # template email + lista clienti outreach
│   ├── customer_satisfaction.js    # dati soddisfazione CUST_SATISFACTION[id]=[{score,note},...]
│   └── report_data.js              # dati per export XLSX (caricato prima di report.js)
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
│   ├── customer.js                 # queryCustomer — analisi singolo
│   ├── response.js                 # generateResponse → {text, actions, aiResult}
│   ├── mail.js                     # sendMail — template email per prodotto
│   └── engine.js                   # sendChat dispatcher, stato analysisMode globale
└── ui/
    ├── map.js                      # initMap, renderMarkers, renderAnalysisMarkers, showCityView, showCustomers
    ├── panel.js                    # aggregate, renderCityList, renderCustomerList, renderAnalysisPanel,
    │                               #   renderAnalysisCityDetail, applyActions, update
    ├── citymodal.js                # modal ⊞: istogrammi Canvas 2D, proiezioni, strategia
    ├── chat.js                     # UI chat: handleChat, resetChat, md, esc, addMsg
    └── report.js                   # export XLSX senza dipendenze esterne
```

### Ordine inclusione script (RISPETTARE OBBLIGATORIAMENTE)
```html
<!-- Nel <head>: Leaflet CSS (unpkg), poi Google Fonts -->
<!-- In fondo al <body>: -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<!-- Costanti inline: CITIES, CUSTOMERS, HISTORY, PRODUCTS, PSHORT, STATUS_LABELS, STATUS_COLORS, REG_COLORS, REGIONS -->
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
<!-- Boot: initMap(); update(); -->
```

---

## 4. Architettura JS — Regole Critiche

### Stato globale
```js
let F = { ageMin:18, ageMax:79, incomeMin:8000, incomeMax:77000, statuses:[], products:[] };
let citySort="count", citySortDir="desc", regFilter="Tutte", citySearch="";
let custSort="reddito", custSortDir="desc", custSearch="";
let selectedCityId=null, expandedCityId=null;
let cityAgg={}, leafletMap=null, markerLayer=null;
// Analisi AI:
let analysisMode=false, analysisResults=null, selectedAnalysisCity=null, lastAiResult=null;
let aiCities=new Set(), aiCustomers=new Map(), aiCityMeta=new Map();
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

**2. `showCustomers()` in modalità normale: chiamato ESCLUSIVAMENTE dal bottone "Vedi N clienti →" nella card espansa.**

**3. In modalità analisi: click su marker waterfall/churn chiama `renderAnalysisPanel()` (non `showCustomers()`), click su marker crosssell chiama `showCustomers()`.**

**4. `update()` non cambia mai vista:**
```js
function update() {
  aggregate(); renderMarkers();
  if (document.getElementById('view-customers').style.display !== 'none') {
    if (selectedCityId && cityAgg[selectedCityId]) renderCustomerList();
    else showCityView();
  } else renderCityList();
}
// MAI showCustomers() da update()
```

**5. Le due viste usano `display:flex` / `display:none` (NON visibility:hidden).**

**6. Popup hover in modalità analisi: usare `mouseover`/`mouseout` + `L.popup().openOn(leafletMap)` — NON `bindPopup`. Il motivo: `clearLayers()` nel click handler distrugge il circle e il suo `bindPopup` prima che possa renderizzarsi.**

### Funzioni principali

**`aggregate()`** — scansiona CUSTOMERS, applica filtri F, costruisce `cityAgg`:
```js
cityAgg[c.id] = { ...c, count, avgIncome, avgAge, statuses:[s,c,f], products:[p0..p6],
                  penetration: products.map(v => Math.round(v/count*100)) }
```

**`renderMarkers()`** — se `analysisMode`, delega a `renderAnalysisMarkers()`. Altrimenti:
- Raggio proporzionale: `r = 10 + (city.count/maxC) * 28` (10–38px)
- Label: `count >= 1000` → `"1.2k"`. Colore: `REG_COLORS[city.reg]`, bianco se selezionata
- `bindTooltip(city.name, {className:'lf-city-tt', direction:'top'})` → hover mostra nome città
- `bindPopup(...)` → click mostra popup dettagliato (nome, regione, 4 KPI, barra stato civile, pill prodotti)

**`showCityView()`** — `view-cities:flex`, `view-customers:none`, `selectedCityId=null`, `selectedAnalysisCity=null`, re-render.

**`showCustomers(cityId)`** — `view-cities:none`, `view-customers:flex`, aggiorna `#cust-city-name/reg`, `back-btn` testo = `analysisMode ? '← Risultati' : '← Città'`, chiama `renderCustomerList()`.

**`renderCustomerList()`** — virtual slice max 200 righe (+ nota "+ N altri..."), KPI: reddito medio, età media, % single, prodotti medi. In modalità churn: usa `byCityId[selectedCityId].custs`. In modalità crosssell: usa `byCityId[selectedCityId]` deduplicato per id.

**`renderCityList()`** — in `analysisMode` delega a `renderAnalysisPanel()`. Card espansa (`expandedCityId === city.id`) mostra: barra stato civile, legenda %, heatmap prodotti (7 pill opacità variabile), 4 metriche extra, bottone **"Vedi N clienti →"**.

**Tab regioni** → chiamano `renderCityList()` (NON `update()`). Sort buttons → stesso.

**Click su mappa vuota** → `selectedCityId=null; expandedCityId=null; renderMarkers(); renderCityList();`

---

## 5. revenues.js — Ricavi €/mese per cliente

Cache lazy (NON inizializzare al load, dipende da CUSTOMERS inline).
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
3. **Regex waterfall** (prima di gap, altrimenti "gap di cattura" collidera con \bgap\b) → `{type:'waterfall', cityId, statuses, incomeRange, ageFilter}`
4. Regex gap → `{type:'gap', ageRange, cityId, statuses, incomeRange}`
5. **Regex churn** → `{type:'churn', cityId, statuses, incomeRange, ageFilter}`
6. Regex cross-sell → `{type:'crosssell', product, cityId, statuses, incomeRange, ageFilter}`
7. Regex demografico → `{type:'demographic', segments, regions, cityId, incomeRange, ageFilter, statuses:[]}`
8. Fallback prodotto rilevato → `{type:'crosssell', product}`
9. Fallback fascia età → `{type:'gap', ageRange}`
10. `{type:'general'}`

### queryCrossSell — bucketing
```js
key = stato + '_' + Math.floor(eta/10) + '_' + Math.floor(reddito/15000)
// Soglia: bucket ≥4 clienti E penetrazione prodotto ≥20%
// → clienti del bucket SENZA il prodotto = candidati
// Output: { candidates:[{id,eta,stato,reddito,pmask,product,correlation,similarCount},...], byCityId:{}, n }
```

### queryProjection — Markov chain
Tassi di transizione (da HISTORY, periodo 3 anni → annualizzati con radice cubica):
```js
aS2C = 1 - (1 - rS2C)**(1/3)  // analoghe aS2F, aC2F
// Fallback se no HISTORY: rS2C=0.05, rS2F=0.02, rC2F=0.04
```
Iterazione annuale: `fS -= dS2C+dS2F; fC += dS2C-dC2F; fF += dS2F+dC2F`

Penetrazione futura: `futPenet[p] = (fS×sPct[0][p] + fC×sPct[1][p] + fF×sPct[2][p]) / fTot`
+ crescita organica: `futPenet[p] += (1 - futPenet[p]) × 0.012 × years`

### queryChurn — scoring rischio abbandono
Quattro fattori di rischio (punteggio 0–100):

| Fattore | Punti | Condizione |
|---------|-------|------------|
| Profondità prodotti | 0–40 | 1→40pt, 2→27pt, 3→13pt, 4+→0pt |
| Nessun prodotto premium | 25 | nessun bit 3-6 (Mutuo/Inv/Vita/Casa) |
| Transizione stato negativa | 25 | Famiglia→Coppia o Coppia→Single in HISTORY |
| Reddito sotto soglia | 10 | reddito < 55% di city.rm |

Soglie: Alto ≥60 / Medio ≥30 / Basso <30

Output `queryChurn()`: `{ customers, byCityId, n, avgScore, totalHigh }`
`byCityId[cityId] = { avgScore, highRisk, medRisk, count, custs:[{id,eta,stato,reddito,pmask,cityId,score,reasons},...] }`

### queryWaterfall — gap di ricavo per prodotto
Eleggibilità prodotti (`getEligibleProducts(eta, stato, reddito)`):

| Prodotto | Condizione |
|----------|-----------|
| C/C, Carta Debito | tutti |
| Carta Credito | reddito ≥ €15.000 |
| Mutuo | Coppia/Famiglia, età 25–58, reddito ≥ €22.000 |
| Investimenti | reddito ≥ €28.000 |
| Ass. Vita | Coppia/Famiglia oppure età ≥ 35 |
| Ass. Casa | Coppia o Famiglia |

`getCityWaterfall(cityId)` → `{ products[7], n, totalActual, totalEligible, totalGap, captureRate }`
`products[i]` = `{ i, name, actual, eligible, gap, actualN, eligibleN, captureRate }`

`queryWaterfall()` → `{ cities:[{cityId,name,reg,actual,eligible,gap,captureRate,count},...], totalActual, totalGap, n }` ordinato per gap discendente.

### Modalità analisi sulla mappa (analysisMode=true)
`renderAnalysisMarkers()` sostituisce `renderMarkers()` — 5 comportamenti:

| Tipo | Colore marker | Label | Dimensione | Hover | Click |
|------|--------------|-------|------------|-------|-------|
| `customer` | bianco + bordo cyan | nessuna | r=22 fisso | `bindPopup` (ok: no clearLayers nel click) | mostra pannello analisi |
| `crosssell` | viola `#a78bfa` | n candidati | ∝ candidati | nessuno | `showCustomers(cityId)` |
| `waterfall` | cyan `#22d3c8` | `€Xk` gap | ∝ gap € | popup mouseover/mouseout (4 KPI) | `renderAnalysisPanel()` |
| `churn` | rosso/arancione/giallo ∝ avgScore | n alto rischio | ∝ highRisk | popup mouseover/mouseout (barra distribuzione + 3 stat) | `renderAnalysisPanel()` |
| `gap/demographic/projection` | cyan `#22d3c8` | nessuna | ∝ count | nessuno | `renderAnalysisPanel()` |

Marker non selezionati: grigi semi-trasparenti (fillOpacity 0.1, opacity 0.2).
Marker selezionato (`selectedAnalysisCity===city.id`): bordo bianco, fillOpacity 0.92, +3px raggio.

**Popup hover pattern (waterfall e churn):**
```js
// NON usare bindPopup (viene distrutto da clearLayers nel click handler)
circle.on('mouseover', () => {
  L.popup({className:'lf-popup', maxWidth:220})
    .setLatLng([city.lat, city.lng]).setContent(popupHtml).openOn(leafletMap);
});
circle.on('mouseout', () => { leafletMap.closePopup(); });
circle.on('click', e => {
  e.originalEvent.stopPropagation();
  leafletMap.closePopup();
  selectedAnalysisCity = city.id;
  renderAnalysisMarkers();
  renderAnalysisPanel();
});
```

**Label waterfall (`iconSize:[0,0]` obbligatorio):**
```js
L.marker([city.lat,city.lng], {
  icon: L.divIcon({className:'', html:'<div style="...white-space:nowrap;transform:translateX(-50%)">'+gapLbl+'</div>',
    iconSize:[0,0], iconAnchor:[0,0]}),
  interactive:false, zIndexOffset:1000
}).addTo(markerLayer);
```

---

## 7. Pannello Analisi (`ui/panel.js`)

### `renderAnalysisPanel()`
Chiamato da `renderCityList()` quando `analysisMode=true`.
- Se `selectedAnalysisCity` è valorizzato → delega a `renderAnalysisCityDetail(cityId)`
- Altrimenti mostra lista risultati nel `#city-list` con header tipo + pulsante ✕

Tipi di lista risultati:
- **crosssell**: summary candidati + righe città ordinate per n candidati, click → `showCustomers(cid)`
- **churn**: summary alto rischio + righe città ordinate per highRisk, click → `renderAnalysisPanel()` (via selectedAnalysisCity)
- **waterfall**: summary gap totale + righe città ordinate per gap, click → `renderAnalysisPanel()` (via selectedAnalysisCity)
- **customer**: card profilo + opportunità cross-sell
- **gap/projection/demographic**: tabelle specifiche per tipo

### `renderAnalysisCityDetail(cityId)`
Mostra dettaglio di una singola città in modalità analisi. Header fisso: pulsante "← Risultati" + ✕.

**Branch waterfall:**
1. Chiama `getCityWaterfall(cityId)` per dati aggiornati
2. 4 KPI: Catturati (#22d3c8) / Potenziale (txt) / Gap (#fb7185) / Tasso cattura (verde/arancione/rosso)
3. Barre prodotto: ghost bar (rgba(34,211,200,0.18)) + barra solid (#22d3c8), scaling su `maxEl`
4. Top 3 opportunità per gap assoluto: `eligibleN - actualN` clienti senza prodotto
5. Pulsante cyan "Vedi N clienti →" → `showCustomers()`

**Branch churn:**
1. 4 KPI: Alto (#fb7185) / Medio (#f97316) / Score medio (colore dinamico) / Analizzati
2. Barra distribuzione a 3 segmenti flex (highRisk/medRisk/lowRisk proporzionali) + legenda %
3. Top 5 clienti: `cs.custs.slice(0,5)`, riga `#id · STATUS · età`, reasons, badge score colorato
4. Fattori di rischio aggregati (solo clienti score≥60): frequenza per fattore, barre proporzionali
5. Pulsante rosso "Vedi N clienti →" → `showCustomers()`

### `applyActions(acts, aiResultData)`
Popola lo stato globale per la modalità analisi:
- `highlight_cities` → `aiCities.add(id)`, `aiCityMeta.set(id, meta)`
- `highlight_customers` → `aiCustomers.set(cityId, Map<id, {suggest, reason, correlation}>)`, `aiCities.add`
- `highlight_churn` → `aiCustomers.set(cityId, Map<id, {churnScore, reasons}>)`, `aiCities.add`
- `waterfall_data` → dati già in `analysisResults`, nessuna struttura aggiuntiva
- `prediction` → mostrato nel pannello analisi, nessun overlay

---

## 8. Modal Città (`ui/citymodal.js`)

Aperto da click sul **titolo** della city card in `renderCityList()` → `openCityModal(cityId)`.

Struttura DOM (overlay fisso, backdrop blur, max-width 640px):
- Header: nome, bottone ×, toggle vista (Prodotti % / Redditività € / [icona SVG] Waterfall), toggle anni (Attuale/+2/+5/+10) — bottoni anni ridotti (secondari)
- `#cmod-canvas-wrap` → `<canvas id="cmod-canvas">` (height=200, width=clientWidth a rAF)
- `#cmod-diff` (tabella Δ, visibile solo quando `_mcYear !== 0`)
- `#cmod-strat-hd` (collassabile) + `#cmod-strat-body`

### Istogramma Canvas 2D — `_mcDrawHist(data, ref, isFut)`
Padding: `PL=48, PR=12, PT=26, PB=52`. `barW = floor((W-PL-PR)/7) - 5`.
5 linee griglia. Barra ghost (ref) = `rgba(255,255,255,0.07)`. Delta label: verde `#34d399` / rosso `#fb7185`.

### Tabella diff — `_mcRenderDiff(cur, fut)`
```js
dTotRev = sum(fut.totalRev) - sum(cur.totalRev)
dp[i] = (fut.penetration[i] - cur.penetration[i]) × 100   // %
dr[i] =  fut.revPerCust[i]  - cur.revPerCust[i]            // €/cliente
```

### Strategia — `_mcRenderStrat(city, custs, cur)`
Top 3 opportunità: `score = (1 - penetrazione) × avgRev` → sort desc → slice(0,3)

Piano d'azione (condizionale, prima condizione soddisfatta):
1. `topOpp.penet < 35%` → campagna attivazione, uplift = `avgRev × n × (0.35 - penet)`
2. `avgInc > 33k && mutuo.penet < 20%` → target Mutuo fascia alta
3. `avgAge < 42 && assVita.penet < 30%` → segmento giovane, alto margine Ass.Vita
4. `inv.penet < 20% && avgInc > 28k` → Investimenti su reddito buono
5. Fallback → "Consolidare con cross-sell su {opps[1].name}"

---

## 9. Chat (`ui/chat.js`)

Funzioni principali:
- `handleChat()` — legge input, chiama `sendChat(q)`, poi `applyActions(resp.actions, resp.aiResult)`
- `resetChat()` — ripristina la chat al messaggio di benvenuto, mostra i suggerimenti
- `md(t)` — mini-markdown: **bold**, `code`, \n\n→paragrafo, \n•→bullet
- `esc(t)` — escape HTML
- `addMsg(role, html, id)` — aggiunge messaggio alla chat

Suggerimenti visibili all'avvio. Il pulsante "Revenue Waterfall" usa un'icona SVG inline (barre + freccia su, `currentColor`, 12×12) al posto dell'emoji.

---

## 10. Checklist Implementazione

### Base
- [ ] Leaflet 1.9.4 CSS + JS da unpkg; Google Fonts (DM Mono 300/400/500, Instrument Serif, Sora 300/400/600)
- [ ] Grid 3 colonne (256px | 1fr | 340px), height:100vh, overflow:hidden
- [ ] CITIES e CUSTOMERS embedded con strutture corrette (bitmask, tuple compatte)
- [ ] `aggregate()` con filtro bitmask (`products.every(p => pmask & (1<<p))`)
- [ ] `renderMarkers()` raggio 10–38px, click → card espansa (NON vista clienti), tooltip nome città
- [ ] `showCustomers()` chiamato SOLO dal bottone "Vedi N clienti →" (o da crosssell click)
- [ ] `update()` che non forza mai cambio vista
- [ ] Slice max 200 clienti + nota "+ N altri"
- [ ] Boot: `initMap(); update();`

### Analisi AI
- [ ] Script caricati nell'ordine esatto della sezione 3
- [ ] `revenues.js`: cache lazy `_buildRevenueCache()`, formule corrette per tutti 7 prodotti
- [ ] `engine/intent.js`: priorità waterfall PRIMA di gap (evita collisione su "gap di cattura")
- [ ] `engine/churn.js`: 4 fattori, soglie Alto≥60/Medio≥30, `byCityId` con `custs` array
- [ ] `engine/waterfall.js`: `getEligibleProducts()`, `getCityWaterfall()`, `queryWaterfall()`
- [ ] `ui/map.js`: popup hover waterfall/churn con `mouseover`/`mouseout` (non `bindPopup`)
- [ ] `ui/map.js`: label waterfall con `iconSize:[0,0]` e `white-space:nowrap`
- [ ] `ui/panel.js`: `renderAnalysisCityDetail()` con branch waterfall e churn con `return` finale
- [ ] `ui/panel.js`: click riga churn/waterfall → `selectedAnalysisCity=cid; renderAnalysisPanel()`
- [ ] `ui/citymodal.js`: canvas ridimensionato a rAF; ghost bar; diff solo quando `_mcYear!==0`
- [ ] CSS: `.lf-city-tt` con `!important` overrides, `::before{display:none!important}`
- [ ] CSS: `.risk-badge`, `.risk-hi/.risk-med/.risk-lo`
- [ ] CSS: `#cmod-year-btns .cmod-ctrl-btn` ridotti (8px, opacity .65)

### Test
- [ ] Click marker → city card espansa (non vista clienti)
- [ ] "Vedi N clienti →" → vista clienti
- [ ] "Revenue Waterfall" → marker cyan con label €Xk; hover → popup 4 KPI; click → dettaglio prodotti
- [ ] "Clienti a Rischio" → marker colorati per score; hover → popup barra distribuzione; click → dettaglio churn
- [ ] chat "cross-sell Mutuo" → marker viola; "proiezione 5 anni" → delta testo; "cliente #42" → marker bianco
- [ ] Tooltip nome città al passaggio del mouse in modalità normale
