"""Merge and validate label-sourced dose data.

Usage: python scripts/check-dosing.py data/dosing-a.json data/dosing-b.json ... > report
Writes data/kb-dosing.json with only entries that pass every check, and prints what was dropped and why.
Checks: known medicine id, https sources (first one DailyMed), at least two sources from the allowed list,
numbers positive and internally consistent (single dose <= max single <= max daily, interval 0.25-168 h,
max daily >= one dose), gates use known vital keys and plausible thresholds.
"""
import json, pathlib, re, sys
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parent.parent
ALLOWED = ("dailymed.nlm.nih.gov", "medlineplus.gov", "www.nlm.nih.gov", "www.ncbi.nlm.nih.gov", "ncbi.nlm.nih.gov",
           "www.nhs.uk", "nhs.uk", "www.who.int", "who.int", "apps.who.int", "iris.who.int", "list.essentialmeds.org",
           "www.nasa.gov", "ntrs.nasa.gov", "www.accessdata.fda.gov", "www.fda.gov", "pubchem.ncbi.nlm.nih.gov")
GATE_RANGE = {"hr": (20, 220), "bp_sys": (50, 250), "bp_dia": (30, 150), "spo2": (50, 100), "temp": (30, 43),
              "glucose": (20, 600), "mass": (20, 300), "hydration": (0, 15)}

ids = set()
for f in json.loads((ROOT / "data/index.json").read_text(encoding="utf-8"))["files"] + ["kb-medication-4.json"]:
    p = ROOT / "data" / f
    if p.exists():
        for r in json.loads(p.read_text(encoding="utf-8")).get("records", []):
            if r.get("type") == "medication":
                ids.add(r["id"])

def num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and x == x and 0 < x < 1e6

out, dropped, fixed = {}, [], []
for path in sys.argv[1:]:
    data = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    for mid, d in data.items():
        why = []
        if mid not in ids: why.append("unknown medicine id")
        if not isinstance(d, dict): dropped.append((mid, "not an object")); continue
        src = [s for s in d.get("sources", []) if isinstance(s, dict) and isinstance(s.get("url"), str) and s["url"].startswith("https://")]
        hosts = [urlparse(s["url"]).hostname or "" for s in src]
        good = [h for h in hosts if h in ALLOWED]
        if not src or hosts[0] != "dailymed.nlm.nih.gov": why.append("first source is not DailyMed")
        if len(set(good)) < 2 and len(good) < 2: why.append("fewer than two allowed sources")
        if any(h not in ALLOWED for h in hosts): why.append("source outside the allowed list: " + ",".join(h for h in hosts if h not in ALLOWED))
        mg, ms, md, iv = d.get("mg"), d.get("maxSingle"), d.get("maxDaily"), d.get("interval")
        for k in ("mg", "maxSingle", "maxDaily", "interval", "amount"):
            if d.get(k) is not None and not num(d.get(k)): why.append(f"{k} not a positive number")
        if num(mg) and num(ms) and not d.get("perKg") and mg > ms: why.append("dose above max single")
        if num(mg) and num(md) and not d.get("perKg") and mg > md: why.append("dose above max daily")
        if num(ms) and num(md) and ms > md: why.append("max single above max daily")
        if num(iv) and not (0.25 <= iv <= 168): why.append("interval out of range")
        if d.get("perKg") and num(mg) and mg > 50: why.append("mg/kg implausibly high")
        gates = []
        for g in d.get("gates", []) or []:
            if not isinstance(g, dict) or g.get("k") not in GATE_RANGE or g.get("op") not in ("<", "<=", ">", ">=") or g.get("act") not in ("block", "warn"):
                fixed.append((mid, "dropped malformed gate")); continue
            lo, hi = GATE_RANGE[g["k"]]
            if not isinstance(g.get("v"), (int, float)) or not (lo <= g["v"] <= hi):
                fixed.append((mid, f"dropped gate with implausible value {g.get('v')}")); continue
            gates.append(g)
        d["gates"] = gates
        if why:
            dropped.append((mid, "; ".join(why)))
        else:
            out[mid] = d

(ROOT / "data/kb-dosing.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
calc = sum(1 for d in out.values() if d.get("mg") and d.get("interval") and d.get("maxDaily") and d.get("unit") in ("mg", "mcg", "g"))
print(f"kept {len(out)} medicines ({calc} with a full mg calculation), dropped {len(dropped)}")
for m, w in dropped: print("  DROPPED", m, "-", w)
for m, w in fixed: print("  FIXED", m, "-", w)
