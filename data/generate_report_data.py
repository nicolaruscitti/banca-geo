"""
Genera data/report_data.js — dati pre-aggregati per i report Excel.

Consuntivo mensile (portfolio totale):
  Gen-Apr : dati reali da customer_operations.csv × operation_costs.csv
            + revenue prodotti (formula revenues.js)
  Mag-Dic : media gen-apr delle operazioni × fattore stagionale [0.85,1.15]
            + stessa revenue prodotti

Budget mensile: somma di city_budget.csv per ogni mese.

Esporta anche dati per-città (usati dal report "Analisi scostamenti - città").
"""

import csv, json, random, math
from collections import defaultdict

random.seed(99)   # seed diverso da generate_city_budget.py (seed=42)

DATA = "C:/NICOLA/GenAI/ciclo_5/banca-geo/data"

MONTHS_IT = ["gennaio","febbraio","marzo","aprile","maggio","giugno",
             "luglio","agosto","settembre","ottobre","novembre","dicembre"]

PROD_MAP = {
    "Conto Corrente": 0, "Carta Debito": 1, "Carta Credito": 2,
    "Mutuo": 3, "Investimenti": 4, "Assicurazione Vita": 5, "Assicurazione Casa": 6
}

# ── Costi per operazione ───────────────────────────────────────────────────
op_cost = {}
with open(f"{DATA}/operation_costs.csv") as f:
    for row in csv.DictReader(f):
        op_cost[row["cod_operazione"]] = float(row["costo_operazione"])

# ── Mapping cliente → città ────────────────────────────────────────────────
cust_city = {}
with open(f"{DATA}/customers_with_city_id.csv") as f:
    for row in csv.DictReader(f):
        cust_city[int(row["customer_id"])] = int(row["city_id"])

# ── Profili clienti ────────────────────────────────────────────────────────
cust_profile = {}
with open(f"{DATA}/customers.csv") as f:
    for row in csv.DictReader(f):
        cust_profile[int(row["customer_id"])] = {
            "eta": int(row["eta"]),
            "reddito": float(row["reddito_annuo"])
        }

# ── Bitmask prodotti per cliente ───────────────────────────────────────────
cust_pmask = defaultdict(int)
with open(f"{DATA}/product_holdings.csv") as f:
    for row in csv.DictReader(f):
        cid = int(row["customer_id"])
        p = row["prodotto"].strip()
        if p in PROD_MAP:
            cust_pmask[cid] |= (1 << PROD_MAP[p])

# ── Revenue mensile prodotti per cliente ───────────────────────────────────
def product_revenue(eta, reddito, pmask):
    t = (reddito - 8000) / 69000
    a = (eta - 18) / 61
    rates = [8, 2, 12,
             round(300 + t * 700),
             round(10  + t * 40),
             round(50  - a * 42),
             round(15  + t * 65)]
    return sum(rates[i] for i in range(7) if pmask & (1 << i))

# Revenue totale portfolio (stessa per tutti i mesi)
total_revenue = sum(
    product_revenue(p["eta"], p["reddito"], cust_pmask[cid])
    for cid, p in cust_profile.items()
)

# Revenue per città
city_revenue = defaultdict(float)
for cid, p in cust_profile.items():
    c = cust_city.get(cid)
    if c:
        city_revenue[c] += product_revenue(p["eta"], p["reddito"], cust_pmask[cid])

# ── Profitti operazioni reali (gen-apr) ────────────────────────────────────
# portfolio_ops[month 1-4] = profitto operazioni totale
portfolio_ops = defaultdict(float)
city_ops = defaultdict(lambda: defaultdict(float))  # city_id → month → valore

with open(f"{DATA}/customer_operations.csv") as f:
    for row in csv.DictReader(f):
        m = int(row["anno_mese"].split("-")[1])
        if m > 4:
            continue
        cid  = int(row["customer_id"])
        cod  = row["cod_operazione"]
        val  = int(row["numero_operazioni"]) * op_cost.get(cod, 0.0)
        portfolio_ops[m] += val
        c = cust_city.get(cid)
        if c:
            city_ops[c][m] += val

# ── Stima mag-dic (portfolio) ──────────────────────────────────────────────
avg_ops = sum(portfolio_ops[m] for m in range(1, 5)) / 4
seasonal_port = {m: random.uniform(0.85, 1.15) for m in range(5, 13)}

def consuntivo_portfolio(m):
    ops = portfolio_ops[m] if m <= 4 else avg_ops * seasonal_port[m]
    return round(ops + total_revenue, 2)

# ── Stima mag-dic per città ────────────────────────────────────────────────
city_seasonal = {}
all_cities = sorted(set(cust_city.values()))
for c in all_cities:
    city_seasonal[c] = {m: random.uniform(0.85, 1.15) for m in range(5, 13)}

def consuntivo_city(city_id, m):
    avg_c = sum(city_ops[city_id].get(k, 0.0) for k in range(1, 5)) / 4
    ops = city_ops[city_id].get(m, 0.0) if m <= 4 else avg_c * city_seasonal[city_id][m]
    return round(ops + city_revenue[city_id], 2)

# ── Budget da city_budget.csv ──────────────────────────────────────────────
budget_portfolio = defaultdict(float)       # month 1-12 → totale
budget_by_city   = defaultdict(dict)        # city_id → month → valore

with open(f"{DATA}/city_budget.csv") as f:
    for row in csv.DictReader(f):
        cid = int(row["city_id"])
        for mi, label in enumerate(MONTHS_IT, start=1):
            v = float(row[label])
            budget_portfolio[mi] += v
            budget_by_city[cid][mi] = v

# ── Assembla struttura JS ──────────────────────────────────────────────────
data = {
    "year": 2026,
    "consuntivo": [consuntivo_portfolio(m) for m in range(1, 13)],
    "budget":     [round(budget_portfolio[m], 2) for m in range(1, 13)],
    "byCity": {
        str(c): {
            "consuntivo": [consuntivo_city(c, m) for m in range(1, 13)],
            "budget":     [round(budget_by_city[c].get(mi, 0), 2) for mi in range(1, 13)]
        }
        for c in all_cities
    }
}

out = f"{DATA}/report_data.js"
with open(out, "w") as f:
    f.write("// Auto-generated by generate_report_data.py — non modificare manualmente\n")
    f.write(f"const REPORT_DATA = {json.dumps(data, separators=(',', ':'))};\n")

print(f"Scritto {out}")
print(f"  Portfolio revenue mensile: €{total_revenue:,.0f}")
print(f"  Ops gen (reale):           €{portfolio_ops[1]:,.0f}")
print(f"  Ops apr (reale):           €{portfolio_ops[4]:,.0f}")
print(f"  Budget gen (totale):       €{budget_portfolio[1]:,.0f}")
print(f"  Consuntivo gen:            €{data['consuntivo'][0]:,.0f}")
