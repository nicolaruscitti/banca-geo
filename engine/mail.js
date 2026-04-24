// engine/mail.js
// Dipendenze: data/customer_emails.js (CUSTOMER_EMAILS)
// Funzioni: sendMail(customerId, productIndex, correlation)

// ── Template mail per prodotto ────────────────────────────────────────────────
const MAIL_TEMPLATES = {

  0: { // Conto Corrente
    subject: 'La invitiamo a scoprire il nostro Conto Corrente su misura per lei',
    body: (customerId, correlation) =>
`Gentile Cliente,

la contattamo per presentarle una proposta personalizzata basata
sull'analisi del suo profilo finanziario.

Sulla base dei dati in nostro possesso e dell'analisi di profili
simili al suo, abbiamo rilevato che il ${correlation}% dei clienti
con caratteristiche analoghe alle sue ha scelto il nostro Conto
Corrente, trovandolo particolarmente adatto alle proprie esigenze.

Il nostro Conto Corrente offre:
- Gestione semplice e digitale del suo denaro
- Carta di debito inclusa senza costi aggiuntivi
- Accesso 24/7 tramite app e internet banking
- Zero spese di tenuta conto per il primo anno
- Bonifici nazionali e SEPA gratuiti illimitati

Riteniamo che questa soluzione possa rappresentare un reale
vantaggio per la sua situazione finanziaria e semplificare
la gestione quotidiana del suo denaro.

Saremo lieti di illustrarle nel dettaglio tutti i vantaggi
riservati a lei. La invitiamo a contattarci o a visitare
la filiale piu' vicina per un colloquio senza impegno.

Cordiali saluti,

Banca Geo -- Servizio Clienti
Analisi e Proposte Personalizzate
banca-geo@bancageo.it | www.bancageo.it
-------------------------------------------------
Questa comunicazione e' stata generata attraverso il sistema
di analisi predittiva Banca Geo Dashboard (cliente #${customerId}).`
  },

  1: { // Carta Debito
    subject: 'Proposta personalizzata: Carta di Debito Banca Geo',
    body: (customerId, correlation) =>
`Gentile Cliente,

siamo lieti di contattarla con una proposta pensata
appositamente per il suo profilo.

L'analisi dei dati ci indica che il ${correlation}% dei clienti
con un profilo simile al suo utilizza la nostra Carta di Debito,
ritenendola uno strumento pratico e sicuro per la gestione
delle spese quotidiane.

La nostra Carta di Debito offre:
- Pagamenti contactless in tutto il mondo
- Prelievi gratuiti presso tutti gli ATM Banca Geo
- Notifiche in tempo reale per ogni transazione
- Blocco e sblocco immediato dall'app mobile
- Protezione acquisti e assicurazione viaggi inclusa

La carta di debito Banca Geo e' accettata in oltre 40 milioni
di esercizi commerciali in tutto il mondo e le garantisce
il massimo controllo sulle sue spese in ogni momento.

Per attivare la sua carta o ricevere ulteriori informazioni,
non esiti a contattarci o a recarsi nella filiale a lei
piu' comoda. Il nostro team e' a sua disposizione.

Cordiali saluti,

Banca Geo -- Servizio Clienti
Analisi e Proposte Personalizzate
banca-geo@bancageo.it | www.bancageo.it
-------------------------------------------------
Questa comunicazione e' stata generata attraverso il sistema
di analisi predittiva Banca Geo Dashboard (cliente #${customerId}).`
  },

  2: { // Carta Credito
    subject: 'Una linea di credito flessibile pensata per lei',
    body: (customerId, correlation) =>
`Gentile Cliente,

sulla base dell'analisi del suo profilo finanziario, siamo
in grado di proporle una soluzione di credito personalizzata.

I nostri dati mostrano che il ${correlation}% dei clienti con
caratteristiche simili alle sue ha scelto la nostra Carta di
Credito, apprezzandone la flessibilita' e i vantaggi esclusivi.

La nostra Carta di Credito offre:
- Plafond personalizzato in base al suo profilo
- Rate flessibili senza interessi per i primi 12 mesi
- Cashback fino al 2% su tutti gli acquisti online
- Protezione acquisti e garanzia estesa sui prodotti
- Accesso a offerte esclusive presso partner selezionati

Con la Carta di Credito Banca Geo potra' gestire le spese
straordinarie con la massima serenita', dilazionando i pagamenti
secondo le sue necessita' e beneficiando di vantaggi esclusivi.

Il nostro consulente sara' lieto di illustrarle le condizioni
personalizzate riservate a lei. La contattia per fissare
un appuntamento senza alcun impegno.

Cordiali saluti,

Banca Geo -- Servizio Clienti
Analisi e Proposte Personalizzate
banca-geo@bancageo.it | www.bancageo.it
-------------------------------------------------
Questa comunicazione e' stata generata attraverso il sistema
di analisi predittiva Banca Geo Dashboard (cliente #${customerId}).`
  },

  3: { // Mutuo
    subject: 'Realizzi il suo progetto abitativo con il Mutuo Banca Geo',
    body: (customerId, correlation) =>
`Gentile Cliente,

la contattamo per presentarle un'opportunita' su misura per
realizzare il suo progetto immobiliare.

Dall'analisi del suo profilo finanziario emerge che il ${correlation}%
dei clienti con caratteristiche analoghe alle sue ha scelto il
nostro Mutuo, trovandolo la soluzione ideale per l'acquisto
o la ristrutturazione della propria abitazione.

Il nostro Mutuo offre:
- Tassi competitivi fissi e variabili tra cui scegliere
- Durata flessibile da 10 a 30 anni
- Istruttoria rapida con risposta in 48 ore lavorative
- Possibilita' di surroga senza costi aggiuntivi
- Consulenza gratuita con il nostro esperto immobiliare

Il Mutuo Banca Geo e' stato progettato per adattarsi alle sue
esigenze specifiche, con rate calibrate sul suo reddito e
condizioni trasparenti senza sorprese.

La nostra rete di consulenti immobiliari e' a sua disposizione
per supportarla in ogni fase del processo, dall'analisi della
fattibilita' fino alla stipula del contratto.

Cordiali saluti,

Banca Geo -- Servizio Clienti
Analisi e Proposte Personalizzate
banca-geo@bancageo.it | www.bancageo.it
-------------------------------------------------
Questa comunicazione e' stata generata attraverso il sistema
di analisi predittiva Banca Geo Dashboard (cliente #${customerId}).`
  },

  4: { // Investimenti
    subject: 'Faccia crescere il suo patrimonio: proposta di investimento personalizzata',
    body: (customerId, correlation) =>
`Gentile Cliente,

i nostri analisti hanno elaborato per lei una proposta di
investimento personalizzata in linea con il suo profilo.

L'analisi mostra che il ${correlation}% dei clienti con un profilo
finanziario simile al suo ha scelto i nostri strumenti di
investimento, ottenendo rendimenti superiori rispetto ai
tradizionali conti di deposito.

I nostri servizi di investimento offrono:
- Portafogli diversificati su misura per il suo profilo di rischio
- Fondi comuni con gestione professionale attiva
- Accesso ai mercati azionari, obbligazionari e ETF
- Report mensili trasparenti con l'andamento del portafoglio
- Consulenza dedicata con un wealth manager certificato

Investire con Banca Geo significa avere al suo fianco un team
di professionisti che monitorano il mercato per lei, adattando
la strategia alle condizioni economiche e ai suoi obiettivi.

Non lasci che il suo risparmio perda valore con l'inflazione:
la invitiamo a fissare un incontro gratuito con il nostro
consulente finanziario per scoprire le opportunita' a lei riservate.

Cordiali saluti,

Banca Geo -- Servizio Clienti
Analisi e Proposte Personalizzate
banca-geo@bancageo.it | www.bancageo.it
-------------------------------------------------
Questa comunicazione e' stata generata attraverso il sistema
di analisi predittiva Banca Geo Dashboard (cliente #${customerId}).`
  },

  5: { // Assicurazione Vita
    subject: 'Protegga il suo futuro: proposta Assicurazione Vita su misura',
    body: (customerId, correlation) =>
`Gentile Cliente,

la sua tranquillita' e quella dei suoi cari e' la nostra
priorita'. Per questo le proponiamo una soluzione assicurativa
calibrata sul suo profilo personale e familiare.

I dati mostrano che il ${correlation}% dei clienti con
caratteristiche simili alle sue ha scelto la nostra
Assicurazione Vita, garantendo protezione e serenita'
per se' e per la propria famiglia.

La nostra Assicurazione Vita offre:
- Capitale garantito ai beneficiari in caso di decesso
- Copertura invalida' totale permanente da infortunio
- Premio mensile accessibile a partire da soli 15 euro
- Beneficiari liberamente designabili e modificabili
- Doppio capitale in caso di morte per infortunio

Proteggere il futuro dei propri cari e' un atto di
responsabilita'. La nostra polizza vita le consente di
farlo con una spesa mensile contenuta, avendo la certezza
che le persone a lei piu' care saranno sempre tutelate.

Il nostro consulente assicurativo e' disponibile per
illustrarle le opzioni di copertura e trovare insieme
la soluzione piu' adatta alle sue esigenze.

Cordiali saluti,

Banca Geo -- Servizio Clienti
Analisi e Proposte Personalizzate
banca-geo@bancageo.it | www.bancageo.it
-------------------------------------------------
Questa comunicazione e' stata generata attraverso il sistema
di analisi predittiva Banca Geo Dashboard (cliente #${customerId}).`
  },

  6: { // Assicurazione Casa
    subject: 'La sua casa merita la massima protezione: proposta Assicurazione Casa',
    body: (customerId, correlation) =>
`Gentile Cliente,

la sua abitazione e' il suo bene piu' prezioso. Per questo
abbiamo elaborato per lei una proposta di protezione su misura.

Dall'analisi del suo profilo emerge che il ${correlation}% dei
clienti con caratteristiche simili alle sue ha scelto la nostra
Assicurazione Casa, trovando nella copertura completa la
tranquillita' di cui aveva bisogno.

La nostra Assicurazione Casa offre:
- Copertura incendio, furto e danni da eventi atmosferici
- Responsabilita' civile verso terzi fino a 1 milione di euro
- Assistenza domiciliare 24/7 con intervento entro 2 ore
- Rimborso spese alberghiere in caso di sinistro grave
- Formula "All Risks" con massima copertura garantita

Con l'Assicurazione Casa Banca Geo potra' dormire sonni
tranquilli sapendo che la sua abitazione e' protetta da
qualsiasi imprevisto, con un servizio di assistenza sempre
disponibile per qualsiasi emergenza.

Non aspetti che sia troppo tardi: la invitiamo a richiedere
un preventivo gratuito personalizzato. Il nostro team e'
pronto ad assisterla nella scelta della polizza piu' adatta.

Cordiali saluti,

Banca Geo -- Servizio Clienti
Analisi e Proposte Personalizzate
banca-geo@bancageo.it | www.bancageo.it
-------------------------------------------------
Questa comunicazione e' stata generata attraverso il sistema
di analisi predittiva Banca Geo Dashboard (cliente #${customerId}).`
  }
};

// ── Funzione di invio mail ────────────────────────────────────────────────────
function sendMail(customerId, productIndex, correlation){
  const email=CUSTOMER_EMAILS[customerId];
  if(!email){
    console.warn('Email non trovata per cliente #'+customerId);
    return;
  }
  const tmpl=MAIL_TEMPLATES[productIndex];
  if(!tmpl){
    console.warn('Template non trovato per prodotto index '+productIndex);
    return;
  }
  const subject=tmpl.subject;
  const body=tmpl.body(customerId,correlation);
  const mailtoLink='mailto:'+email
    +'?subject='+encodeURIComponent(subject)
    +'&body='+encodeURIComponent(body);
  window.open(mailtoLink,'_blank');
}
