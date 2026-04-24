"""
Genera city_budget.csv

Per ogni città e ogni mese (gen-dic):
  valore = profitti_operazioni(mese) + revenues_prodotti + rumore ±0-9%

Profitti operazioni:
  - Gen-Apr: dati reali da customer_operations.csv (numero_op * costo_op)
  - Mag-Dic: media gen-apr della città × fattore stagionale casuale [0.85, 1.15]

Revenue prodotti (costante mensile per cliente):
  Formula da revenues.js:
    t = (reddito - 8000) / 69000
    a = (eta - 18) / 61
    prodotti → [8, 2, 12, round(300+t*700), round(10+t*40), round(50-a*42), round(15+t*65)]
"""

import csv, random, math
from collections import defaultdict

random.seed(42)

DATA = "C:/NICOLA/GenAI/ciclo_5/banca-geo/data"

PROD_MAP = {
    "Conto Corrente": 0, "Carta Debito": 1, "Carta Credito": 2,
    "Mutuo": 3, "Investimenti": 4, "Assicurazione Vita": 5, "Assicurazione Casa": 6
}
MONTHS_IT = ["gennaio","febbraio","marzo","aprile","maggio","giugno",
             "luglio","agosto","settembre","ottobre","novembre","dicembre"]

# ── 1. Costi per codice operazione ─────────────────────────────────────────
op_cost = {}
with open(f"{DATA}/operation_costs.csv") as f:
    for row in csv.DictReader(f):
        op_cost[row["cod_operazione"]] = float(row["costo_operazione"])

# ── 2. Mapping cliente → città ──────────────────────────────────────────────
cust_city = {}
with open(f"{DATA}/customers_with_city_id.csv") as f:
    for row in csv.DictReader(f):
        cust_city[int(row["customer_id"])] = int(row["city_id"])

# ── 3. Profili clienti (età e reddito) ─────────────────────────────────────
cust_profile = {}
with open(f"{DATA}/customers.csv") as f:
    for row in csv.DictReader(f):
        cust_profile[int(row["customer_id"])] = {
            "eta": int(row["eta"]),
            "reddito": float(row["reddito_annuo"])
        }

# ── 4. Prodotti per cliente (bitmask) ──────────────────────────────────────
cust_pmask = defaultdict(int)
with open(f"{DATA}/product_holdings.csv") as f:
    for row in csv.DictReader(f):
        cid = int(row["customer_id"])
        p = row["prodotto"].strip()
        if p in PROD_MAP:
            cust_pmask[cid] |= (1 << PROD_MAP[p])

# ── 5. Revenue mensile prodotti per cliente ────────────────────────────────
def product_revenue(eta, reddito, pmask):
    t = (reddito - 8000) / 69000
    a = (eta - 18) / 61
    rates = [8, 2, 12,
             round(300 + t * 700),
             round(10  + t * 40),
             round(50  - a * 42),
             round(15  + t * 65)]
    total = 0.0
    for i in range(7):
        if pmask & (1 << i):
            total += rates[i]
    return total

# Revenue mensile per città (invariante per tutti i mesi)
city_monthly_revenue = defaultdict(float)
for cid, profile in cust_profile.items():
    city_id = cust_city.get(cid)
    if city_id is None:
        continue
    city_monthly_revenue[city_id] += product_revenue(
        profile["eta"], profile["reddito"], cust_pmask[cid]
    )

# ── 6. Profitti operazioni gen-apr (dati reali) ────────────────────────────
# city_ops_month[city_id][month_1-4] = profitto operazioni
city_ops_month = defaultdict(lambda: defaultdict(float))

with open(f"{DATA}/customer_operations.csv") as f:
    for row in csv.DictReader(f):
        anno_mese = row["anno_mese"]   # es. "2026-01"
        month_num = int(anno_mese.split("-")[1])  # 1-4
        if month_num > 4:
            continue
        cid     = int(row["customer_id"])
        cod     = row["cod_operazione"]
        n_ops   = int(row["numero_operazioni"])
        cost    = op_cost.get(cod, 0.0)
        city_id = cust_city.get(cid)
        if city_id is None:
            continue
        city_ops_month[city_id][month_num] += n_ops * cost

# ── 7. Stima mag-dic: media gen-apr × fattore stagionale casuale ───────────
# Fattori mensili casuali per ogni città (ripetibili grazie al seed)
SEASONAL = {}
for city_id in cust_city.values():
    if city_id not in SEASONAL:
        SEASONAL[city_id] = {
            m: random.uniform(0.85, 1.15) for m in range(5, 13)
        }

def ops_for_month(city_id, month):
    if month <= 4:
        return city_ops_month[city_id].get(month, 0.0)
    avg_q1 = sum(city_ops_month[city_id].get(m, 0.0) for m in range(1, 5)) / 4
    return avg_q1 * SEASONAL[city_id][month]

# ── 8. Lista città (da city_profile) ──────────────────────────────────────
city_ids = []
with open(f"{DATA}/city_profile.csv") as f:
    for row in csv.DictReader(f):
        city_ids.append(int(row["city_id"]))
city_ids.sort()

# ── 9. Genera e scrive city_budget.csv ────────────────────────────────────
rows = []
for city_id in city_ids:
    row = {"city_id": city_id}
    for m, label in enumerate(MONTHS_IT, start=1):
        ops_profit = ops_for_month(city_id, m)
        rev        = city_monthly_revenue[city_id]
        total      = ops_profit + rev
        # rumore ±0-9%
        sign  = random.choice([-1, 1])
        pct   = random.uniform(0, 0.09)
        total = total * (1 + sign * pct)
        row[label] = round(total, 2)
    rows.append(row)

out_path = f"{DATA}/city_budget.csv"
with open(out_path, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["city_id"] + MONTHS_IT)
    writer.writeheader()
    writer.writerows(rows)

print(f"Scritto {out_path} — {len(rows)} città")
# Stampa prime 3 righe come anteprima
for r in rows[:3]:
    print(r)
