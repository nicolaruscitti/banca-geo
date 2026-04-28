# Banca Geo

Dashboard geospaziale per l'analisi del portafoglio clienti di una banca italiana.  
Visualizza 10.000 clienti distribuiti su 30 città, con filtri interattivi, analisi AI in linguaggio naturale, gestione campagne e export report.

**Apri l'app:** [nicolaruscitti.github.io/banca-geo/html/banca-geo.html](https://nicolaruscitti.github.io/banca-geo/html/banca-geo.html)

---

## Requisiti

- Browser moderno (Chrome, Firefox, Edge, Safari)
- Connessione internet (mappa, font e Leaflet caricati da CDN)
- L'app deve essere servita via HTTP — non funziona aprendola come file locale (`file://`)

---

## Come aprire in locale

```bash
# Con Python (dalla cartella radice del progetto)
python -m http.server 8000
# poi apri: http://localhost:8000/html/banca-geo.html
```

In alternativa usa l'estensione **Live Server** di VS Code.

---

## Struttura dell'interfaccia

L'app è divisa in tre colonne fisse:

```
┌─────────────┬──────────────────────┬──────────────┐
│  Sidebar    │      Mappa Italia    │  Pannello    │
│  (256px)    │                      │  (340px)     │
│             │   ┌──────────────┐   │              │
│  Filtri     │   │   Chat AI    │   │  Città /     │
│  Campagne   │   └──────────────┘   │  Clienti     │
│  Report     │                      │              │
└─────────────┴──────────────────────┴──────────────┘
```

---

## Funzionalità

### Mappa
30 città rappresentate con marker circolari proporzionali al numero di clienti filtrati. Il colore identifica la macroregione:

| Colore | Macroregione |
|--------|-------------|
| Blu `#4f8ef7` | Nord Ovest |
| Viola `#a78bfa` | Nord Est |
| Verde `#34d399` | Centro |
| Giallo `#fbbf24` | Sud |
| Rosa `#fb7185` | Isole |

- **Hover** su un marker → mostra il nome della città
- **Click** su un marker → seleziona la città ed espande la sua scheda nel pannello destro
- **Click su area vuota** → deseleziona

### Filtri (sidebar sinistra)
| Filtro | Tipo | Comportamento |
|--------|------|---------------|
| Età | Doppio slider 18–79 anni | Min non supera Max−1 |
| Reddito annuo | Doppio slider €8k–€77k (step €500) | Min non supera Max−500 |
| Stato civile | Pill toggle: Single / Coppia / Famiglia | Più valori = OR |
| Prodotti | Pill toggle: C/C, Deb, Cred, Mutuo, Inv, Ass.V, Ass.C | Più valori = AND |

Il pulsante **↺ reset filtri** appare solo quando almeno un filtro è attivo. Ogni modifica aggiorna istantaneamente mappa e lista.

### Pannello risultati (colonna destra)

**Vista città** (default):
- 4 KPI globali: clienti totali, città attive, reddito medio, età media
- Tab per macroregione (Tutte / Nord Ovest / Nord Est / Centro / Sud / Isole)
- Ricerca per nome città
- Ordinamento per: Clienti · Reddito · Età · Q.Vita · Digital
- Card per ogni città con rank, barra proporzionale e metriche

**Card espansa** (click sulla card o sul marker):
- Distribuzione stato civile con barra colorata
- Heatmap penetrazione prodotti (7 pill con opacità variabile)
- Metriche: costo vita, reddito mercato, % single, % famiglie
- Mini-riepilogo gap ricavi (waterfall)
- Pulsante **"Vedi N clienti →"** per accedere alla lista clienti

**Vista clienti** (aperta dal pulsante "Vedi N clienti →"):
- 4 KPI: reddito medio, età media, % single, prodotti medi
- Ricerca per ID cliente
- Ordinamento per età, reddito o ID
- Max 200 righe visibili (nota "+ N altri" se eccede)
- Pulsante **← Città** per tornare

### Modal analisi città (pulsante ⊞)
Click sul pulsante **⊞** in alto a destra di una card → apre un modal con 4 viste:

| Vista | Contenuto |
|-------|-----------|
| **Prodotti** | Istogramma penetrazione % per prodotto |
| **Redditività** | Istogramma ricavo medio mensile €/cliente per prodotto |
| **⚠ Rischio** | Analisi rischio abbandono: distribuzione score, top clienti, fattori aggregati |
| **Waterfall** | Gap di ricavo per prodotto: ricavi attuali vs potenziali |

Per le viste Prodotti e Redditività sono disponibili proiezioni temporali: **Attuale · +2 anni · +5 anni · +10 anni**. La proiezione usa catene di Markov calibrate sullo storico reale dei clienti (2021–2024).

Quando si seleziona un anno futuro:
- La barra colorata mostra il valore proiettato
- La barra grigia trasparente mostra il valore attuale come riferimento
- Il Δ in verde/rosso appare sopra ogni barra
- Sotto il grafico compare la tabella differenze (Δ penetrazione % e Δ ricavo/cliente)

In fondo al modal c'è una sezione **Strategia** (collassabile) con i top 3 prodotti prioritari e un piano d'azione condizionale.

### Chat AI

Pannello integrato nella colonna centrale. Si digita in italiano e si ottengono:
- Risposta testuale con statistiche chiave
- Marker sulla mappa ridisegnati e colorati per evidenziare i risultati
- Lista aggiornata nel pannello destro

**7 tipi di analisi disponibili:**

| Tipo | Esempio di query | Cosa restituisce |
|------|-----------------|-----------------|
| **Cross-sell** | "Chi può ricevere proposta Mutuo?" | Candidati per città con correlazione % |
| **Churn** | "Clienti a rischio abbandono" | Score rischio per cliente su 4 fattori, top città |
| **Revenue Waterfall** | "Gap di cattura ricavi per città" | Gap €/mese tra ricavi attuali e potenziali |
| **Proiezione** | "Proiezione distribuzione 5 anni" | Evoluzione stato civile e prodotti con Markov |
| **Gap prodotti** | "Gap prodotti fascia 30-45 anni" | Prodotti meno penetrati nel segmento vs media |
| **Demografico** | "Confronto single e coppie in Nord Italia" | Confronto KPI e penetrazione tra segmenti |
| **Cliente singolo** | "Analizza il cliente #42" | Profilo completo + opportunità cross-sell |

In **modalità analisi** i marker cambiano aspetto:

| Colore | Tipo analisi |
|--------|-------------|
| Viola `#a78bfa` | Cross-sell (dimensione ∝ candidati) |
| Rosso/Arancione/Giallo | Churn (colore ∝ score medio di rischio) |
| Cyan `#22d3c8` | Waterfall, Gap, Demografico, Proiezione |
| Bianco con bordo cyan | Cliente singolo |

Le città non rilevanti diventano grigie e ridotte.

### Campagne

Accessibile dalla sezione **Campagne** nella sidebar (collassabile):

**Nuova Campagna** — form per creare una campagna email:
- Periodo di validità (data inizio / fine)
- Prodotto da promuovere (Carta di Credito, Mutuo, Investimento, Ass. Vita, Ass. Casa)
- Destinatari: tutti i clienti, per regione, o per singola città
- Tipo evento abbinato (Sport, Moda, Design, Food, Altro) + nome evento

Cliccando **Mostra Anteprima** si apre un secondo modal con il riepilogo e il testo dell'email generato automaticamente, modificabile prima dell'invio.

**Archivio Campagne** — lista di tutte le campagne inviate (salvate in localStorage) con filtri per data, prodotto, destinatari e genere. Ogni campagna ha un pulsante per vedere il dettaglio e uno per eliminarla.

### Report

Accessibile dalla sezione **Report** nella sidebar (collassabile):

| Report | Contenuto |
|--------|-----------|
| **Analisi degli scostamenti** | Export XLSX con KPI per ogni città: clienti, reddito medio, penetrazione prodotti, ricavi |
| **Analisi degli scostamenti - città** | Come sopra, ma con selezione manuale delle città da includere |
| **Opinione generale dei clienti** | Export XLSX con dati di soddisfazione aggregati per prodotto |

---

## Dataset

| File | Righe | Contenuto |
|------|-------|-----------|
| `data/city_profile.csv` | 30 | Indici socioeconomici per città (qualità vita, digital index, reddito mercato, costo vita) |
| `data/customers.csv` | 10.000 | Anagrafica clienti (età, stato civile, reddito) |
| `data/customers_with_city_id.csv` | 10.000 | Mapping cliente → città |
| `data/customer_history.csv` | ~8.000 | Storico stato civile 2021–2024 (per proiezioni e churn) |
| `data/product_holdings.csv` | 28.527 | Prodotti posseduti per cliente |

I dati vengono caricati a runtime tramite `fetch()` dai file CSV. Un overlay di caricamento con barra di progresso è visibile durante l'inizializzazione.

**Prodotti disponibili (indice 0–6):**
`Conto Corrente · Carta Debito · Carta Credito · Mutuo · Investimenti · Assicurazione Vita · Assicurazione Casa`

---

## Struttura file

```
banca-geo/
├── html/
│   └── banca-geo.html          ← file da aprire nel browser
├── data/
│   ├── loader.js               ← carica CSV a runtime, costruisce CITIES/CUSTOMERS/HISTORY
│   ├── revenues.js             ← calcolo ricavi mensili per cliente
│   ├── customer_emails.js      ← template email per prodotto
│   ├── customer_satisfaction.js← dati soddisfazione per cliente
│   ├── report_data.js          ← dati per export XLSX
│   ├── city_profile.csv
│   ├── customers.csv
│   ├── customers_with_city_id.csv
│   ├── customer_history.csv
│   └── product_holdings.csv
├── engine/
│   ├── correlation.js          ← funzioni statistiche (Pearson, profili simili)
│   ├── extractors.js           ← NLP: estrazione entità dalla query
│   ├── intent.js               ← classificazione intent (7 tipi)
│   ├── crosssell.js            ← analisi candidati cross-sell (bucketing)
│   ├── projection.js           ← proiezioni demografiche (Markov)
│   ├── churn.js                ← scoring rischio abbandono
│   ├── waterfall.js            ← gap di ricavo per prodotto
│   ├── demographic.js          ← confronto segmenti demografici
│   ├── gap.js                  ← gap penetrazione per fascia età
│   ├── customer.js             ← analisi cliente singolo
│   ├── response.js             ← generazione risposta testuale + azioni UI
│   ├── mail.js                 ← template email per campagne
│   └── engine.js               ← dispatcher sendChat, stato analysisMode
└── ui/
    ├── map.js                  ← Leaflet, marker, modalità analisi
    ├── panel.js                ← aggregazione, lista città/clienti, pannello AI
    ├── citymodal.js            ← modal ⊞: istogrammi, churn, waterfall, proiezioni, strategia
    ├── chat.js                 ← UI chat, suggerimenti, toggle, reset
    └── report.js               ← export XLSX, selezione città, report opinioni
```

---

## Dipendenze esterne

| Libreria | Versione | Scopo |
|----------|----------|-------|
| Leaflet | 1.9.4 | Mappa interattiva (CDN unpkg) |
| CartoDB Dark Matter | — | Tile mappa scura, senza API key |
| Google Fonts | — | DM Mono, Instrument Serif, Sora |

Nessun framework JavaScript. Nessun build step. Vanilla JS puro.

---

## Sviluppo

Progetto sviluppato con [Claude](https://claude.ai) — Anthropic.  
Documentazione tecnica completa per riprodurre o estendere il progetto: [`CLAUDE.md`](CLAUDE.md).
