"""
Genera data/customer_satisfaction.js da customer_product_satisfaction.csv.
Formato compatto con lookup table per motivazioni e consigli (deduplicazione).

CSAT_MOT[i] = stringa motivazione unica
CSAT_CON[i] = stringa consiglio unica
CUST_SATISFACTION[cid] = [[prodIdx, sat%, motIdx, conIdx], ...]
"""
import csv, json
from collections import defaultdict

PROD_MAP = {
    "Conto Corrente":0, "Carta Debito":1, "Carta Credito":2,
    "Mutuo":3, "Investimenti":4, "Assicurazione Vita":5, "Assicurazione Casa":6
}

mot_list, con_list = [], []
mot_idx, con_idx = {}, {}
records = defaultdict(list)

with open('customer_product_satisfaction.csv', newline='', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        cid = int(row['customer_id'])
        prod = PROD_MAP.get(row['prodotto'])
        if prod is None: continue
        sat = int(row['soddisfazione'].replace('%', ''))
        mot = row['motivazione'].strip()
        con = row['Consigli'].strip()

        if mot not in mot_idx:
            mot_idx[mot] = len(mot_list)
            mot_list.append(mot)
        if con not in con_idx:
            con_idx[con] = len(con_list)
            con_list.append(con)

        records[cid].append([prod, sat, mot_idx[mot], con_idx[con]])

with open('customer_satisfaction.js', 'w', encoding='utf-8') as f:
    f.write('// customer_satisfaction.js — feedback soddisfazione (5000 clienti campionati)\n')
    f.write('// CSAT_MOT[i]=motivazione | CSAT_CON[i]=consiglio\n')
    f.write('// CUST_SATISFACTION[cid]=[[prodIdx,sat%,motIdx,conIdx],...]\n')
    f.write('const CSAT_MOT=')
    f.write(json.dumps(mot_list, ensure_ascii=False, separators=(',',':')))
    f.write(';\nconst CSAT_CON=')
    f.write(json.dumps(con_list, ensure_ascii=False, separators=(',',':')))
    f.write(';\nconst CUST_SATISFACTION={')
    parts = []
    for cid in sorted(records):
        parts.append(str(cid) + ':' + json.dumps(records[cid], separators=(',',':')))
    f.write(','.join(parts))
    f.write('};\n')

import os
size_kb = os.path.getsize('customer_satisfaction.js') // 1024
print(f"Generato customer_satisfaction.js ({size_kb} KB)")
print(f"  Clienti: {len(records)}")
print(f"  Record totali: {sum(len(v) for v in records.values())}")
print(f"  Motivazioni uniche: {len(mot_list)}")
print(f"  Consigli unici: {len(con_list)}")
