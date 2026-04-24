"""
Genera data/customer_product_satisfaction.csv
- 5000 clienti campionati casualmente da customers.csv
- Per ogni prodotto posseduto: soddisfazione (%), motivazione soggettiva, consiglio soggettivo
- La media per prodotto corrisponde ai target di product_satisfaction.csv
- Motivazioni e consigli individuali giustificano collettivamente i testi aggregati
"""

import csv
import random
from collections import defaultdict

random.seed(42)

# ---------------------------------------------------------------------------
# 1. Leggi customers.csv
# ---------------------------------------------------------------------------
customers = []
with open('customers.csv', newline='', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        customers.append(int(row['customer_id']))

# ---------------------------------------------------------------------------
# 2. Campiona 5000 clienti
# ---------------------------------------------------------------------------
sampled_ids = set(random.sample(customers, 5000))

# ---------------------------------------------------------------------------
# 3. Leggi product_holdings.csv per i clienti campionati
# ---------------------------------------------------------------------------
customer_products = defaultdict(list)
with open('product_holdings.csv', newline='', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        cid = int(row['customer_id'])
        if cid in sampled_ids:
            customer_products[cid].append(row['prodotto'].strip())

# ---------------------------------------------------------------------------
# 4. Target soddisfazione medi (da product_satisfaction.csv)
# ---------------------------------------------------------------------------
PRODUCT_TARGETS = {
    'Conto Corrente':      72,
    'Carta Debito':        78,
    'Carta Credito':       65,
    'Mutuo':               58,
    'Investimenti':        61,
    'Assicurazione Vita':  55,
    'Assicurazione Casa':  63,
}

# ---------------------------------------------------------------------------
# 5. Template motivazioni e consigli per prodotto — 3 livelli (high/mid/low)
#    Progettati in modo che il loro aggregato giustifichi i testi di product_satisfaction.csv
# ---------------------------------------------------------------------------
TEMPLATES = {

    # ------------------------------------------------------------------ Conto Corrente (72%)
    'Conto Corrente': {
        'motivazione': {
            'high': [
                "Sono molto soddisfatto della gestione digitale: l'home banking funziona h24 senza interruzioni e ogni operazione è immediata. L'app è intuitiva e mi permette di fare tutto dal telefono.",
                "Il conto risponde perfettamente alle mie esigenze quotidiane. Notifiche in tempo reale, bonifici rapidi e un servizio clienti sempre disponibile. Nessun problema rilevante.",
                "Apprezzo la disponibilità h24 dell'home banking e le funzionalità complete dell'app. I costi sono adeguati ai servizi offerti e il personale di filiale è sempre stato preparato.",
                "Ottima esperienza complessiva. L'app mobile ha funzionalità avanzate che uso ogni giorno e il costo mensile è competitivo rispetto ai servizi ricevuti.",
            ],
            'mid': [
                "L'home banking funziona bene nella maggior parte dei casi, ma le commissioni sui bonifici mi sembrano un po' alte. Il servizio digitale è comunque nella media di mercato.",
                "La gestione digitale è apprezzabile, però i costi di tenuta conto pesano. Il personale in filiale è cortese ma i tempi di attesa sono spesso lunghi.",
                "Uso principalmente l'app e sono abbastanza soddisfatto. L'unico rammarico è l'importo delle commissioni sulle operazioni di bonifico che ritengo eccessivo.",
                "Il conto va bene per le operazioni quotidiane, ma vorrei un'app più moderna con analisi delle spese e notifiche proattive. Le commissioni sono nella media ma potrebbero essere ridotte.",
            ],
            'low': [
                "Le commissioni sui bonifici e il canone mensile sono decisamente troppo elevati rispetto ai servizi offerti. La concorrenza offre condizioni molto migliori.",
                "Il servizio allo sportello è scadente: code interminabili, personale poco formato e risposte vaghe. Il canone è alto e i servizi non lo giustificano.",
                "I costi si sommano ogni mese in modo insostenibile. Le commissioni su ogni operazione e il canone fisso mi fanno valutare il passaggio a un conto online gratuito.",
                "L'app è obsoleta, il servizio clienti risponde lentamente e i costi sono ingiustificati. Ho trovato prodotti equivalenti a costo zero in banche concorrenti.",
            ],
        },
        'consigli': {
            'high': [
                "Aggiungere funzionalità di analisi automatica delle spese per categoria e notifiche proattive sulle scadenze. Il servizio è già ottimo ma questi miglioramenti lo renderebbero eccellente.",
                "Mantenere la qualità del servizio digitale e magari introdurre un cashback sulle operazioni più frequenti per premiare i clienti fedeli.",
                "Continuare a migliorare l'app con budget automatici per categoria di spesa. Sarebbe utile anche un riepilogo mensile delle spese con confronto rispetto al mese precedente.",
                "Aggiungere la possibilità di aprire conti separati per obiettivi di risparmio specifici direttamente dall'app. Per il resto il servizio è già di alta qualità.",
            ],
            'mid': [
                "Ridurre le commissioni sui bonifici ordinari e introdurre un conto a canone zero con soglia minima di utilizzo mensile per i clienti attivi.",
                "Potenziare l'app mobile con analisi automatica delle spese e investire nella formazione omogenea del personale di filiale su tutto il territorio.",
                "Abbassare il canone mensile e introdurre condizioni più vantaggiose per i clienti fedeli. Aggiungere notifiche intelligenti per gestire meglio le finanze personali.",
                "Introdurre una versione base del conto gratuita per chi supera una soglia mensile di operazioni. Snellire i processi in filiale riducendo i tempi di attesa.",
            ],
            'low': [
                "È urgente eliminare le commissioni sui bonifici e introdurre un canone zero per chi supera una soglia di utilizzo. Senza questi cambiamenti valuterò il passaggio a un conto online.",
                "Rivedere completamente la struttura commissionale, ridurre i tempi di attesa in filiale e rinnovare l'app mobile. Questi sono standard già offerti da molti competitor.",
                "Ridurre i costi, formare il personale di filiale e aggiornare l'app. Senza interventi urgenti la banca perderà clienti a favore delle fintech.",
                "Eliminare le commissioni sulle operazioni ordinarie e investire in un'app moderna. I clienti digitali non accettano più di pagare per operazioni che le banche online offrono gratis.",
            ],
        },
    },

    # ------------------------------------------------------------------ Carta Debito (78%)
    'Carta Debito': {
        'motivazione': {
            'high': [
                "Uso la carta tutti i giorni per pagamenti contactless e mi trovo benissimo. Funziona con Apple Pay e Google Pay senza problemi ed è accettata ovunque.",
                "Ottima carta: sicura, affidabile e compatibile con tutti i wallet digitali. Il contactless è veloce e la sicurezza delle transazioni mi dà piena tranquillità.",
                "La carta è praticamente perfetta per le mie esigenze quotidiane. La compatibilità con i wallet digitali è eccellente e non ho mai avuto problemi con le transazioni.",
                "Semplicità d'uso eccellente e compatibilità totale con i sistemi di pagamento digitale. La sicurezza è al top e le notifiche di transazione sono immediate.",
            ],
            'mid': [
                "Carta valida per l'uso quotidiano, soprattutto per i pagamenti contactless. L'unica nota dolente è il limite giornaliero di prelievo ATM che trovo un po' rigido.",
                "Funziona bene con i wallet digitali e il contactless è comodo. Però quando ho dovuto sostituire la carta ho aspettato troppo per la consegna.",
                "Soddisfacente per gli acquisti quotidiani, ma i limiti di prelievo non si adattano alle esigenze variabili. La sostituzione in caso di furto è lenta.",
                "Il contactless funziona bene ma i limiti giornalieri sono fissi e non modificabili via app. Sarebbe utile poterli regolare autonomamente.",
            ],
            'low': [
                "I limiti di prelievo ATM sono troppo rigidi e non posso modificarli dall'app. Ho aspettato quasi due settimane per la sostituzione dopo la perdita della carta.",
                "La gestione dei limiti è antiquata: non posso aumentarli dall'app e devo chiamare la banca ogni volta. Nel 2024 questo è inaccettabile.",
                "Tempi di sostituzione carta inaccettabili. Sono rimasto senza carta per giorni a causa di procedure burocratiche lente. I limiti fissi non si adattano alle esigenze reali.",
                "Nessuna flessibilità: limiti inamovibili e sostituzione lentissima in caso di smarrimento. I competitor offrono sostituzione in 24h e limiti modificabili in tempo reale.",
            ],
        },
        'consigli': {
            'high': [
                "Aggiungere la possibilità di impostare notifiche per ogni transazione e forse estendere la copertura assicurativa sugli acquisti online senza costi aggiuntivi.",
                "Sarebbe utile un riepilogo mensile delle categorie di spesa integrato nell'app. Per il resto il servizio è già eccellente.",
                "Continuare a espandere la compatibilità con i wallet digitali e aggiungere funzionalità di risparmio automatico per arrotondamento degli acquisti.",
                "Introdurre premi fedeltà legati all'utilizzo contactless mensile. Il servizio è già ottimo, piccoli incentivi lo renderebbero ancora più competitivo.",
            ],
            'mid': [
                "Rendere configurabile tramite app il limite giornaliero di prelievo e spesa. Garantire la sostituzione della carta entro 24 ore lavorative in caso di smarrimento.",
                "Snellire il processo di sostituzione carta e permettere di gestire i limiti dall'app senza dover contattare la filiale o il call center.",
                "Estendere di default la copertura assicurativa sugli acquisti online e migliorare i tempi di risposta per le emergenze di sostituzione.",
                "Permettere al cliente di impostare limiti personalizzati da app in autonomia. Introdurre la sostituzione carta express entro 24h come standard.",
            ],
            'low': [
                "Rendere immediatamente modificabili i limiti via app e garantire sostituzione carta entro 24h. Questi standard sono già offerti da molte banche concorrenti.",
                "Digitalizzare completamente la gestione della carta: limiti modificabili in tempo reale, sostituzione express, blocco e sblocco immediato da app.",
                "Allineare i servizi ai competitor digitali: sostituzione in giornata, limiti configurabili in autonomia, copertura assicurativa online inclusa senza costi extra.",
                "Rinnovare completamente la gestione della carta: tutto deve essere gestibile dall'app, inclusa la modifica dei limiti e la richiesta di sostituzione urgente.",
            ],
        },
    },

    # ------------------------------------------------------------------ Carta Credito (65%)
    'Carta Credito': {
        'motivazione': {
            'high': [
                "Il programma cashback è ottimo e i vantaggi sui viaggi mi hanno già fatto risparmiare molto. Le condizioni contrattuali sono state spiegate chiaramente fin dall'inizio.",
                "Molto soddisfatto dei benefit accessori e del cashback diretto. Il tasso annuo è competitivo e l'estratto conto è chiaro e dettagliato.",
                "Apprezzo il cashback e i vantaggi sui viaggi. Per il mio utilizzo il costo annuale è ampiamente giustificato dai benefici concreti ricevuti.",
                "La carta mi ha fatto risparmiare significativamente grazie al cashback. I vantaggi aggiuntivi su hotel e voli sono un plus concreto. Contratto chiaro fin dall'inizio.",
            ],
            'mid': [
                "I benefit del cashback sono apprezzabili, ma il tasso di interesse sul credito revolving è troppo alto. Le commissioni annue non sempre si ripagano con l'utilizzo.",
                "Il cashback funziona bene ma l'estratto conto non è sempre chiaro sugli addebiti. Ho avuto difficoltà a interpretare alcune voci nel primo anno.",
                "Apprezzo i vantaggi accessori, ma la trasparenza sulle commissioni lascia a desiderare. Il contratto iniziale era difficile da interpretare completamente.",
                "I vantaggi ci sono ma i costi sono elevati. Il cashback non compensa pienamente il costo annuale se non si supera una certa soglia di spesa mensile.",
            ],
            'low': [
                "I tassi di interesse sul credito revolving sono esosi e le commissioni annuali non sono giustificate dai benefit offerti. L'estratto conto è poco comprensibile.",
                "Ho difficoltà a capire le condizioni del contratto. Le commissioni si accumulano e il cashback non basta a compensare i costi fissi annuali.",
                "Tasso revolving inaccettabile e scarsa trasparenza negli addebiti. Ho dovuto chiamare più volte il servizio clienti per chiarire voci che non capivo.",
                "Le condizioni contrattuali erano incomprensibili al momento della firma. I costi reali superano ampiamente i benefit e il cashback ha troppe restrizioni.",
            ],
        },
        'consigli': {
            'high': [
                "Ampliare il programma fedeltà con premi più facilmente raggiungibili e un cashback diretto senza soglie minime di accumulo.",
                "Mantenere i vantaggi sui viaggi e aggiungere categorie di cashback su abbonamenti digitali e spese ricorrenti.",
                "Aggiungere notifiche proattive sugli addebiti ricorrenti e migliorare la categorizzazione automatica delle spese nell'app.",
                "Introdurre un cashback extra per categorie specifiche (es. carburante, supermercati) e semplificare il riscatto dei punti accumulati.",
            ],
            'mid': [
                "Semplificare il formato dell'estratto conto digitale con visualizzazione chiara per categoria. Introdurre piani di rateizzazione a tasso agevolato comunicati proattivamente.",
                "Migliorare la chiarezza contrattuale e ridurre le commissioni annuali per chi raggiunge una soglia minima di spesa mensile.",
                "Ampliare il cashback diretto senza soglie minime e rendere più comprensibili le condizioni di utilizzo del credito revolving.",
                "Comunicare proattivamente all'addebito la possibilità di rateizzare importi superiori a 500 euro a tasso agevolato. Semplificare l'estratto conto.",
            ],
            'low': [
                "Abbassare urgentemente i tassi revolving e semplificare il contratto. L'estratto conto va completamente ridisegnato per essere leggibile a chiunque.",
                "Introdurre comunicazione proattiva e chiara su ogni addebito. Ridurre le commissioni annuali e rendere il cashback realmente conveniente senza soglie.",
                "Rivedere la struttura commissionale e offrire piani di rateizzazione agevolata automaticamente proposti per importi significativi. Il contratto deve essere comprensibile.",
                "Rendere il contratto trasparente con un riepilogo visivo dei costi reali. Abbassare il tasso revolving e proporre automaticamente la rateizzazione agevolata.",
            ],
        },
    },

    # ------------------------------------------------------------------ Mutuo (58%)
    'Mutuo': {
        'motivazione': {
            'high': [
                "Il consulente dedicato è stato eccellente: disponibile, chiaro e proattivo. I tempi di approvazione sono stati inferiori alle aspettative e il tasso fisso è molto competitivo.",
                "Ottima esperienza complessiva. La banca mi ha guidato in ogni fase dell'istruttoria con professionalità e il consulente ha risposto a tutte le mie domande tempestivamente.",
                "Il tasso ottenuto è ottimo e il consulente mi ha informato proattivamente su ogni aspetto del contratto. Processo gestito con efficienza nonostante la complessità.",
                "Consulente preparato e disponibile che mi ha seguito passo dopo passo. Processo burocratico semplificato rispetto alle aspettative e ottimo tasso finale.",
            ],
            'mid': [
                "Il consulente è stato disponibile, ma i tempi dell'istruttoria sono stati lunghi, quasi 60 giorni. La documentazione richiesta era eccessiva rispetto ad altre banche.",
                "Soddisfatto del tasso, ma il processo burocratico è stato stressante. Molti documenti richiesti a distanza di giorni senza una comunicazione chiara sulle fasi.",
                "Il mutuo è competitivo ma l'incertezza del tasso variabile nell'attuale contesto di tassi crescenti mi preoccupa. Avrei gradito più informazioni proattive dalla banca.",
                "Il consulente è competente ma l'istruttoria è lenta e la comunicazione sullo stato della pratica scarsa. Ho dovuto chiamare spesso per sapere a che punto eravamo.",
            ],
            'low': [
                "L'istruttoria ha richiesto quasi due mesi e ho dovuto inviare documenti più volte. La banca non è stata proattiva nel comunicarmi le variazioni del tasso variabile.",
                "Burocrazia insostenibile. Ho impiegato 8 settimane per ottenere l'approvazione mentre altri istituti l'avrebbero completata in 3 settimane.",
                "Tempi di approvazione inaccettabili e nessuna informazione spontanea sulla rinegoziazione nonostante l'aumento dell'Euribor. Mi sento abbandonato dalla banca.",
                "Processo kafkiano: documenti richiesti a ripetizione, tempi biblici, comunicazione quasi assente. Nel frattempo l'Euribor è salito senza che nessuno mi contattasse.",
            ],
        },
        'consigli': {
            'high': [
                "Mantenere la qualità del servizio di consulenza dedicato. Sarebbe utile un simulatore online più dettagliato per scenari futuri di tasso variabile.",
                "Introdurre un'area clienti con tracking in tempo reale dello stato della pratica. Per il resto il servizio è stato eccellente.",
                "Aggiungere notifiche automatiche al superamento di soglie critiche dell'Euribor con proposta proattiva di rinegoziazione o surroga.",
                "Mantenere i consulenti dedicati e aggiungere la firma digitale per snellire ulteriormente l'istruttoria. Il servizio è già ottimo.",
            ],
            'mid': [
                "Digitalizzare l'istruttoria con firma elettronica e caricamento documenti da app, puntando a ridurre i tempi di approvazione a meno di 30 giorni.",
                "Offrire simulatori online avanzati con scenari di tasso variabile nel tempo e attivare comunicazioni proattive sulle variazioni dell'Euribor.",
                "Snellire la documentazione richiesta, comunicare le fasi del processo in modo chiaro e proporre automaticamente la rinegoziazione al variare significativo del tasso.",
                "Introdurre un sistema di tracking della pratica in tempo reale accessibile dal cliente. Ridurre la documentazione richiesta coordinando internamente le verifiche.",
            ],
            'low': [
                "Digitalizzare urgentemente l'istruttoria: firma elettronica, caricamento documenti da app, approvazione entro 30 giorni. Standard già offerti dai competitor.",
                "Creare un sistema di monitoraggio proattivo per i mutui a tasso variabile con proposte automatiche di surroga al superamento di soglie Euribor concordate.",
                "Ridurre drasticamente i tempi di approvazione e attivare alert automatici per le variazioni del tasso variabile. Il cliente non deve inseguire la banca.",
                "Avviare la digitalizzazione totale del processo: istruttoria online in 30 giorni, firma elettronica, comunicazioni proattive obbligatorie sulle variazioni di tasso.",
            ],
        },
    },

    # ------------------------------------------------------------------ Investimenti (61%)
    'Investimenti': {
        'motivazione': {
            'high': [
                "Il portafoglio è gestito professionalmente e i rendimenti sono stati buoni nonostante la volatilità. I report sono chiari e il consulente mi aggiorna regolarmente.",
                "Molto soddisfatto della diversificazione del mio portafoglio. Il consulente è preparato, mi spiega bene ogni scelta e i costi di gestione sono trasparenti.",
                "Gestione eccellente in un periodo di mercato difficile. Il mio consulente mi ha informato proattivamente di ogni decisione rilevante limitando le perdite.",
                "Portafoglio ben costruito con una diversificazione intelligente. Il consulente è competente e comunica le performance in modo chiaro e regolare.",
            ],
            'mid': [
                "Il portafoglio è ben diversificato ma i costi di gestione (TER) non sono sempre chiari. In periodo di volatilità avrei gradito più comunicazioni dalla banca.",
                "La gestione è professionale ma la comunicazione sulle performance effettive è insufficiente. Devo chiedere io gli aggiornamenti anziché riceverli automaticamente.",
                "Apprezzo la diversificazione del portafoglio, ma le spese di gestione sono elevate e poco trasparenti. Il recente periodo di volatilità ha ridotto la mia fiducia.",
                "Gestione nella media, ma mi aspetterei report mensili automatici e consulenze periodiche incluse nel servizio. I costi non sono sempre facili da capire.",
            ],
            'low': [
                "I costi di gestione sono alti e poco trasparenti. Non ricevo comunicazioni chiare sulle performance e ho scoperto i rendimenti negativi solo dal rendiconto annuale.",
                "Il TER è oscuro e le performance non vengono comunicate proattivamente. Ho perso fiducia durante il periodo di volatilità per mancanza totale di informazioni.",
                "Comunicazione quasi assente sulle performance. Ho scoperto i risultati negativi solo dal rendiconto annuale. Costi elevati non giustificati dai rendimenti ottenuti.",
                "Il portafoglio ha sottoperformato e nessuno mi ha informato in modo proattivo. I costi sono difficili da capire e sembrano eccessivi rispetto ai rendimenti.",
            ],
        },
        'consigli': {
            'high': [
                "Continuare con i report periodici e aumentare la frequenza delle consulenze. Aggiungere una dashboard online per il tracking in tempo reale delle performance.",
                "Mantenere la qualità della gestione e ampliare l'offerta con ETF a basso costo per ulteriore diversificazione a costi contenuti.",
                "Aggiungere una dashboard online con analisi dei rendimenti storici e simulazioni future basate su diversi scenari di mercato.",
                "Introdurre un'app dedicata per monitorare il portafoglio in tempo reale con alert sulle variazioni significative e comparazione con benchmark di riferimento.",
            ],
            'mid': [
                "Fornire report mensili personalizzati in linguaggio semplice con spiegazione chiara di rendimenti, rischi assunti e costi sostenuti nel periodo.",
                "Introdurre sessioni periodiche di consulenza almeno semestrali per riallineare il portafoglio agli obiettivi di vita del cliente.",
                "Ampliare l'offerta con ETF e fondi passivi a basso costo per la clientela con profilo di rischio medio-basso, troppo spesso indirizzata su prodotti ad alto costo.",
                "Rendere i costi di gestione completamente trasparenti con un riepilogo mensile in linguaggio semplice. Introdurre consulenze periodiche incluse nel costo del servizio.",
            ],
            'low': [
                "Rendere i costi di gestione completamente trasparenti e inviare report mensili automatici con performance chiare confrontate con i benchmark. È il minimo atteso.",
                "Introdurre comunicazioni proattive obbligatorie in caso di variazioni significative del portafoglio e rendere il TER comprensibile anche ai non specialisti.",
                "Riformare completamente la comunicazione: report mensili automatici, consulenza semestrale inclusa nel costo, offerta obbligatoria di ETF a basso costo come alternativa.",
                "Rivedere completamente la struttura dei costi e introdurre comunicazioni automatiche mensili sulle performance. Senza questi cambiamenti valuterò altri gestori.",
            ],
        },
    },

    # ------------------------------------------------------------------ Assicurazione Vita (55%)
    'Assicurazione Vita': {
        'motivazione': {
            'high': [
                "Ho capito bene il valore della polizza e il premio mensile è sostenibile rispetto alla protezione garantita alla mia famiglia. Il consulente è stato molto chiaro.",
                "La polizza mi dà tranquillità per il futuro della mia famiglia. Le condizioni sono state spiegate bene e il premio è adeguato alla copertura offerta.",
                "Ho dovuto usare la polizza e l'erogazione del capitale è stata rapida e senza problemi. Il valore concreto della protezione è diventato evidente in quel momento.",
                "Consulente eccellente che mi ha spiegato ogni scenario con simulazioni concrete. Ora capisco il valore della polizza e sono tranquillo per il futuro della mia famiglia.",
            ],
            'mid': [
                "La copertura è adeguata ma ho faticato a capire le condizioni contrattuali. Il premio mensile è accettabile ma il rapporto costo-beneficio non è sempre evidente.",
                "Il prodotto funziona, ma la comunicazione iniziale non è stata sufficientemente chiara. Ho impiegato del tempo a capire cosa coprisse esattamente la polizza.",
                "Non sono pienamente convinto del valore nel breve termine. Il consulente ha cercato di spiegarmelo ma le condizioni contrattuali rimangono complesse da interpretare.",
                "I premi sono nella media ma faccio fatica a percepire il beneficio concreto nel presente. Avrei bisogno di una comunicazione più chiara sul valore a lungo termine.",
            ],
            'low': [
                "I premi sono troppo alti rispetto ai benefici percepibili nel breve termine. Non riesco a vedere il valore concreto di questa polizza per la mia situazione attuale.",
                "Contratto incomprensibile e premi elevati. Non sono stato adeguatamente informato sulle coperture reali e sulle esclusioni al momento della sottoscrizione.",
                "Non capisco perché pago così tanto per benefici così distanti nel tempo. La comunicazione della banca su questo prodotto è inadeguata e poco trasparente.",
                "Le condizioni contrattuali erano un muro di testo incomprensibile. Ho firmato senza capire pienamente cosa coprisse e i premi mensili mi sembrano eccessivi.",
            ],
        },
        'consigli': {
            'high': [
                "Aggiungere simulatori interattivi online per mostrare l'impatto concreto della polizza in diversi scenari familiari futuri.",
                "Continuare a formare i consulenti sulla comunicazione chiara del prodotto. Aggiungere una revisione annuale gratuita delle condizioni della polizza.",
                "Introdurre polizze modulari che si adattino alle fasi di vita del cliente con coperture attivabili progressivamente.",
                "Mantenere la qualità del servizio consulenziale e aggiungere strumenti digitali per il monitoraggio del valore accumulato nel tempo.",
            ],
            'mid': [
                "Sviluppare materiali informativi semplici, video esplicativi e simulatori di scenario per migliorare la comprensione del prodotto già in fase di vendita.",
                "Introdurre polizze modulari con coperture selezionabili progressivamente per adattarsi meglio alle esigenze del cliente nel tempo.",
                "Avviare campagne strutturate di educazione finanziaria sulla protezione del nucleo familiare, con focus sui clienti con figli minori o mutuo in corso.",
                "Rendere obbligatorio un colloquio di comprensione prima della sottoscrizione. Sviluppare video esplicativi e simulatori di scenario accessibili dall'app.",
            ],
            'low': [
                "Rendere le condizioni contrattuali comprensibili con un riepilogo visivo delle coperture e delle esclusioni principali prima della firma.",
                "Creare polizze modulari a costo ridotto con coperture selezionabili. Sviluppare video esplicativi e simulatori di scenario obbligatori prima della sottoscrizione.",
                "Avviare un programma strutturato di educazione finanziaria e rivedere i premi al ribasso. Nessuno dovrebbe firmare una polizza senza capirne il valore reale.",
                "Rendere il contratto leggibile, introdurre premi più accessibili e creare materiali educativi digitali che spieghino il valore della copertura vita in modo concreto.",
            ],
        },
    },

    # ------------------------------------------------------------------ Assicurazione Casa (63%)
    'Assicurazione Casa': {
        'motivazione': {
            'high': [
                "Ottima polizza con copertura incendio e furto molto completa. Il servizio di assistenza domiciliare h24 mi ha già aiutato in un'emergenza notturna con grande efficienza.",
                "Molto soddisfatto della copertura e del servizio assistenza. Ho avuto un sinistro minore gestito rapidamente e senza burocrazia eccessiva.",
                "La polizza è chiara, la copertura è ampia e il servizio assistenza è davvero disponibile h24. Il premio annuale è pienamente giustificato dalla qualità del servizio.",
                "Il servizio assistenza ha risposto in meno di un'ora durante un'emergenza notturna. La copertura contro furto e incendio è completa e rassicurante.",
            ],
            'mid': [
                "La copertura contro incendio e furto è buona e il servizio di assistenza funziona. Però ho avuto un sinistro che ha impiegato oltre 20 giorni per essere liquidato.",
                "Apprezzo l'assistenza h24 ma il processo di gestione sinistri è lento e burocratico. Le esclusioni contrattuali non erano chiare al momento della sottoscrizione.",
                "Servizio assistenza ottimo ma gestione del sinistro lunga e stressante. Le esclusioni contrattuali mi hanno sorpreso negativamente al momento del rimborso.",
                "La copertura di base è soddisfacente ma i tempi di liquidazione sinistri sono troppo lunghi. Ho aspettato quasi un mese per un rimborso relativamente semplice.",
            ],
            'low': [
                "Ho aspettato 30 giorni per il rimborso di un sinistro relativamente semplice. Le esclusioni contrattuali erano scritte in modo quasi incomprensibile.",
                "La gestione sinistri è inaccettabilmente lenta. Ho impiegato settimane a ottenere un rimborso che avrebbe dovuto essere automatico. Le esclusioni erano una trappola.",
                "Gestione sinistri caotica: nessun tracking della pratica, tempi lunghissimi e personale poco informato. Ho scoperto delle esclusioni solo quando ho presentato il sinistro.",
                "Tempi di liquidazione sinistri biblici e nessuna trasparenza sullo stato della pratica. Le esclusioni contrattuali erano nascoste in clausole incomprensibili.",
            ],
        },
        'consigli': {
            'high': [
                "Aggiungere un'app dedicata per il tracking delle pratiche assicurative e magari estendere la copertura ad altri tipi di danni domestici.",
                "Mantenere l'eccellente servizio assistenza h24 e aggiungere la possibilità di denuncia sinistri fotografica da remoto per velocizzare ulteriormente i rimborsi.",
                "Continuare a formare il personale del servizio assistenza e aggiungere una sezione FAQ chiara sulle coperture e le esclusioni nell'area clienti.",
                "Introdurre un sistema di perizia fotografica da remoto tramite app per gestire i sinistri minori entro 48 ore. Il servizio è già ottimo, questo lo renderebbe eccellente.",
            ],
            'mid': [
                "Digitalizzare il processo di denuncia sinistri con un sistema di tracking in tempo reale dello stato della pratica accessibile da app.",
                "Semplificare il linguaggio contrattuale evidenziando le principali esclusioni in un riepilogo visivo al momento della sottoscrizione.",
                "Introdurre un servizio di perizia fotografica da remoto tramite app per accelerare la valutazione e il rimborso dei danni di entità minore.",
                "Creare un sistema di tracking sinistri in tempo reale e semplificare il contratto con un riepilogo visivo delle esclusioni prima della firma.",
            ],
            'low': [
                "È urgente digitalizzare completamente la gestione sinistri con tracking in tempo reale. I tempi attuali superano di gran lunga ogni standard accettabile.",
                "Riscrivere il contratto in linguaggio semplice e creare un riepilogo visivo delle esclusioni obbligatorio prima della firma. Introdurre perizia fotografica da remoto.",
                "Ridurre i tempi di liquidazione sinistri a meno di 5 giorni lavorativi, digitalizzare la denuncia e rendere le esclusioni comprensibili prima della sottoscrizione.",
                "Rivoluzionare la gestione sinistri: tracking online, perizia fotografica da remoto, rimborsi entro 5 giorni. Senza questi cambiamenti il prodotto non è competitivo.",
            ],
        },
    },
}

# ---------------------------------------------------------------------------
# 6. Genera punteggi di soddisfazione con media esatta per prodotto
# ---------------------------------------------------------------------------
def generate_scores(n, target_mean, std=12, min_val=30, max_val=100):
    """Genera n punteggi interi con media il più vicina possibile a target_mean."""
    scores = [max(min_val, min(max_val, round(random.gauss(target_mean, std)))) for _ in range(n)]
    # Correggi la media per farla coincidere esattamente col target
    for _ in range(5):
        current = sum(scores) / len(scores)
        delta = target_mean - current
        scores = [max(min_val, min(max_val, round(s + delta))) for s in scores]
    return scores

# Raggruppa le righe per prodotto
product_rows = defaultdict(list)  # prodotto -> [customer_id, ...]
for cid in sorted(sampled_ids):
    for prod in customer_products.get(cid, []):
        if prod in PRODUCT_TARGETS:
            product_rows[prod].append(cid)

# ---------------------------------------------------------------------------
# 7. Costruisci tutti i record
# ---------------------------------------------------------------------------
records = []
for prod, cids in product_rows.items():
    target = PRODUCT_TARGETS[prod]
    scores = generate_scores(len(cids), target)
    tpl = TEMPLATES[prod]

    for cid, score in zip(cids, scores):
        if score >= target + 8:
            tier = 'high'
        elif score <= target - 8:
            tier = 'low'
        else:
            tier = 'mid'

        records.append({
            'customer_id':  cid,
            'prodotto':     prod,
            'soddisfazione': f"{score}%",
            'motivazione':  random.choice(tpl['motivazione'][tier]),
            'Consigli':     random.choice(tpl['consigli'][tier]),
        })

# Ordina per customer_id
records.sort(key=lambda r: r['customer_id'])

# ---------------------------------------------------------------------------
# 8. Scrivi CSV
# ---------------------------------------------------------------------------
output_path = 'customer_product_satisfaction.csv'
with open(output_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(
        f,
        fieldnames=['customer_id', 'prodotto', 'soddisfazione', 'motivazione', 'Consigli']
    )
    writer.writeheader()
    writer.writerows(records)

print(f"Righe generate: {len(records)}")
print(f"Clienti unici:  {len({r['customer_id'] for r in records})}")
print()
print(f"{'Prodotto':<25} {'Target':>8} {'Media':>8} {'N':>6}")
print("-" * 50)
for prod in PRODUCT_TARGETS:
    rows = [r for r in records if r['prodotto'] == prod]
    if rows:
        avg = sum(int(r['soddisfazione'].replace('%', '')) for r in rows) / len(rows)
        print(f"{prod:<25} {PRODUCT_TARGETS[prod]:>7}%  {avg:>6.1f}%  {len(rows):>5}")
