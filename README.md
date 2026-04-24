# banca-geo

Dashboard geospaziale di analisi clienti bancari italiani.

**File corrente:** `html/banca-geo_10.html`

---

## Requisiti

- Browser moderno (Chrome, Firefox, Edge, Safari)
- Connessione internet (mappa e font caricati da CDN)
- Nessuna installazione, nessun server, nessuna API key

**Come aprire:** doppio click su `html/banca-geo_10.html`

---

## Cosa fa

### Mappa Italia

30 città rappresentate con marker circolari proporzionali al numero di clienti filtrati. Il colore indica la macroregione. Click su un marker → seleziona la città e apre la sua card nella lista a destra. La mappa non apre mai direttamente la vista clienti.

### Filtri sidebar (colonna sinistra)

| Filtro | Tipo | Comportamento |
|---|---|---|
| Età | Doppio range slider 18–79 | Min non supera Max−1 |
| Reddito | Doppio range slider €8k–€77k (step €500) | Min non supera Max−500 |
| Stato civile | Pill toggle (Single / Coppia / Famiglia) | Più valori = OR |
| Prodotti | Pill toggle (7 prodotti) | Più valori = AND (cliente deve avere tutti) |

Il bottone "↺ reset filtri" appare solo quando almeno un filtro è attivo. Ogni modifica ricalcola istantaneamente aggregati e marker.

### Lista città (colonna destra — vista default)

- 4 KPI globali: totale clienti, numero città attive, reddito medio, età media
- Tab per macroregione (Tutte / Nord Ovest / Nord Est / Centro / Sud / Isole)
- Ricerca per nome città
- Ordinamento per: Clienti · Reddito · Età · Q.Vita · Digital (click = desc, secondo click = asc)
- Card per ogni città con rank, barra proporzionale e 4 metriche

**Card espansa** (click sulla card o sul marker): mostra barra stato civile, percentuali, heatmap penetrazione prodotti (7 pill), metriche extra, bottone **"Vedi N clienti →"**.

### Vista clienti (drill-down)

Accesso esclusivo tramite "Vedi N clienti →". Mostra:
- 4 KPI: reddito medio, età media, % single, prodotti medi
- Tabella clienti con ID, stato civile, età, reddito, chip prodotti
- Ricerca per ID cliente
- Ordinamento per età, reddito o ID
- Max 200 righe visibili (nota "+ N altri" se eccede)
- Bottone "← Città" per tornare alla lista

### Modal città (analisi approfondita)

Click sul titolo di una city card → apre un modal overlay con:

**Istogramma** — Canvas 2D con 7 barre (una per prodotto). Due viste:
- **Prodotti** — penetrazione % (quanti clienti hanno quel prodotto)
- **Redditività** — ricavo medio mensile per cliente in €

**Proiezioni temporali** — Bottoni: Attuale · +2 anni · +5 anni · +10 anni

Quando si seleziona un anno futuro, l'istogramma mostra:
- Barra colorata = valore proiettato
- Barra grigia trasparente = valore attuale (riferimento)
- Label verde/rosso sopra ogni barra = Δ rispetto all'attuale

Sotto l'istogramma appare la **tabella differenze**: per ogni prodotto, Δ penetrazione (%) e Δ ricavo/cliente (€), con totale variazione ricavi mensili in testa.

**Sezione strategia** (collassabile con click sull'header):
- KPI: ricavo/cliente/mese, ricavo totale/mese, età e reddito medi
- Top 3 opportunità cross-sell (ranking per potenziale economico)
- Piano d'azione con raccomandazioni condizionali basate su penetrazione, reddito e fascia d'età

### Chat AI (analisi in linguaggio naturale)

Pannello chat integrato nel layout. Digita una domanda in italiano e ricevi:
- Risposta testuale con statistiche chiave
- Highlight sulla mappa (marker colorati e ridimensionati)
- Aggiornamento della lista con i risultati rilevanti

**5 tipi di analisi riconosciuti automaticamente:**

| Tipo | Esempio query | Cosa restituisce |
|---|---|---|
| Cross-sell | "Chi può ricevere proposta Mutuo?" | Candidati per città, correlazione % |
| Proiezione | "Come cambia il portafoglio in 5 anni?" | Δ stato civile e prodotti con tassi Markov |
| Gap | "Gap prodotti fascia 30-45 anni?" | Prodotti meno penetrati nel segmento, città impattate |
| Demografico | "Differenze tra single e famiglie?" | Confronto KPI e penetrazione per segmento |
| Cliente singolo | "Analizza cliente #42" | Profilo, opportunità cross-sell ordinate per correlazione |

In **modalità analisi**, i marker sulla mappa cambiano:
- **Viola** — città con candidati cross-sell (dimensione ∝ numero candidati)
- **Cyan** — città rilevanti per gap / demografico / proiezione
- **Bianco** — città del cliente singolo analizzato
- Città non rilevanti diventano grigie e ridotte

---

## Struttura file

```
banca-geo/
├── html/
│   └── banca-geo_10.html      ← file da aprire
├── data/
│   ├── revenues.js             ← calcolo ricavi mensili per cliente
│   ├── customer_emails.js      ← template email per outreach
│   ├── city_profile.csv        ← 30 città (sorgente dati)
│   ├── customers.csv           ← 10.000 clienti
│   ├── customers_with_city_id.csv
│   ├── customer_history.csv    ← storico stato civile 2021–2024
│   └── product_holdings.csv    ← prodotti per cliente
├── engine/
│   ├── correlation.js          ← funzioni statistiche base
│   ├── extractors.js           ← NLP: estrazione entità dalla query
│   ├── intent.js               ← classificazione intent (5 tipi)
│   ├── crosssell.js            ← analisi candidati cross-sell
│   ├── projection.js           ← proiezioni Markov
│   ├── demographic.js          ← confronto segmenti
│   ├── gap.js                  ← gap penetrazione per fascia età
│   ├── customer.js             ← analisi cliente singolo
│   ├── response.js             ← generazione risposta + azioni UI
│   ├── mail.js                 ← template email per prodotto
│   └── engine.js               ← dispatcher sendChat, stato analisi
└── ui/
    ├── map.js                  ← Leaflet, marker, vista analisi
    ├── panel.js                ← aggregazione, lista città/clienti
    ├── citymodal.js            ← modal: istogrammi, proiezioni, strategia
    └── chat.js                 ← UI chat, input, rendering
```

I dati (CITIES, CUSTOMERS, HISTORY) sono embedded come costanti JavaScript direttamente in `banca-geo_10.html`. Gli script in `engine/` e `ui/` sono caricati come file separati tramite tag `<script src="...">`.

---

## Dipendenze esterne

| Libreria | Versione | Scopo |
|---|---|---|
| Leaflet | 1.9.4 | Mappa interattiva |
| CartoDB Dark Matter | — | Tile mappa scura (no API key) |
| Google Fonts | — | DM Mono, Instrument Serif, Sora |

Nessun framework JavaScript. Nessun build step. Vanilla JS puro.

---

## Documentazione tecnica

`CLAUDE.md` contiene la documentazione completa per riprodurre o estendere il progetto:

- Sezioni 1–10: architettura di `banca-geo_3.html` (base del sistema)
- Sezioni 11–22: tutto ciò che è stato aggiunto in `banca-geo_10.html`
  - Struttura file e ordine di inclusione script
  - Formato HISTORY e formule revenues.js
  - Implementazione istogrammi Canvas 2D
  - Logica proiezioni Markov (formule complete)
  - Engine AI: flusso detectIntent, queryCrossSell, queryProjection
  - Istruzioni passo per passo per ricreare da zero
  - Checklist di verifica

---

## Autore

Progetto sviluppato con Claude — Anthropic.
