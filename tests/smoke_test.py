"""Sonnenblume regression + resilience tests.

Run locally:   pip install playwright && playwright install chromium && python tests/smoke_test.py
Runs in CI on every push (.github/workflows/test.yml). Exits non-zero on any failure.
"""
import http.server, json, os, sys, threading, functools, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = int(os.environ.get("PORT", "8799"))
BASE = f"http://localhost:{PORT}"
KEY = "sonnenblume-v1"

# ---------- static server that sends the same security headers as production ----------
cfg = json.loads((ROOT / "vercel.json").read_text())
HEADERS = {h["key"]: h["value"] for h in cfg["headers"][0]["headers"] if h["key"] != "Strict-Transport-Security"}
HEADERS["Content-Security-Policy"] = HEADERS["Content-Security-Policy"].replace("; upgrade-insecure-requests", "")

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        for k, v in HEADERS.items():
            self.send_header(k, v)
        super().end_headers()
    def log_message(self, *a): pass
    def do_GET(self):
        if self.path.startswith("/api/kb"):  # mirror production when no database is configured
            body = b'{"source":"none","count":0,"records":[]}'
            self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(body); return
        if not (ROOT / self.path.split("?")[0].lstrip("/")).exists() and "." in self.path.split("/")[-1].split("?")[0]:
            self.send_response(404); self.send_header("Content-Type", "text/html"); self.end_headers(); self.wfile.write((ROOT / "404.html").read_bytes()); return
        return super().do_GET()
    def guess_type(self, p):
        return "application/manifest+json" if str(p).endswith(".webmanifest") else super().guess_type(p)

srv = http.server.ThreadingHTTPServer(("localhost", PORT), functools.partial(Handler, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()

FAILS, PASSES = [], 0
def check(name, cond, detail=""):
    global PASSES
    if cond: PASSES += 1; print("  ok  ", name)
    else: FAILS.append(name); print("  FAIL", name, detail)

def page_errors(pg):
    errs = []
    pg.on("pageerror", lambda e: errs.append("JS " + str(e)))
    pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    return errs

def set_today(pg, **vals):
    pg.evaluate("""([k,v])=>{const s=JSON.parse(localStorage.getItem(k));Object.assign(s.days[s.days.length-1],v);localStorage.setItem(k,JSON.stringify(s));}""", [KEY, vals])
    pg.reload(); pg.wait_for_timeout(1200)
    if pg.locator("#escModal").is_visible(): pg.keyboard.press("Escape")

def open_med(pg, name):
    pg.evaluate("location.hash='library'"); pg.wait_for_timeout(250)
    pg.fill("#kbQ", name); pg.wait_for_timeout(150)
    pg.locator("#kbList .libitem", has_text=name).first.click(); pg.wait_for_timeout(150)
    return pg.locator(".dosebox").inner_text()

with sync_playwright() as p:
    b = p.chromium.launch()

    print("Pages load cleanly")
    for path in ["/", "/privacy.html", "/app.html"]:
        ctx = b.new_context(); pg = ctx.new_page(); errs = page_errors(pg)
        r = pg.goto(BASE + path); pg.wait_for_timeout(1500)
        check(f"{path} returns 200", r.status == 200, r.status)
        check(f"{path} has no console errors", not errs, errs)
        if path == "/app.html":
            for v in ["dashboard", "log", "trends", "library", "pharmacy", "guide"]:
                pg.evaluate(f"location.hash='{v}'"); pg.wait_for_timeout(400)
                check(f"view {v} renders", pg.locator(f"#v-{v}").is_visible())
            check("no fault bar on clean run", pg.locator("#faultBar").count() == 0)
            check("library loads 266 records", "266" in pg.locator("#kbSrc").inner_text(), pg.locator("#kbSrc").inner_text())
        ctx.close()
    ctx = b.new_context(); pg = ctx.new_page(); r = pg.goto(BASE + "/missing-page.html")
    check("unknown page shows 404 page", r.status == 404 and "Lost in space" in pg.content()); ctx.close()

    print("Security")
    ctx = b.new_context(); pg = ctx.new_page(); pg.goto(BASE + "/app.html"); pg.wait_for_timeout(800)
    blocked = pg.evaluate("()=>{try{const s=document.createElement('script');s.textContent='window.__inl=1';document.head.appendChild(s);}catch(e){}return !window.__inl}")
    check("CSP blocks injected inline scripts", blocked)
    ctx.close()
    ctx = b.new_context(bypass_csp=True); pg = ctx.new_page(); errs = page_errors(pg)
    pg.goto(BASE + "/privacy.html")
    P = '<img src=x onerror="window.__xss=1">'
    pg.evaluate("""([k,P])=>localStorage.setItem(k,JSON.stringify({env:'iss',name:P,crew:{leader:P,cmo:P},baseMass:P,zone:P,view:P,
      days:[{day:3,hr:P,bp:{sys:P,dia:1},mood:P,symptoms:[P]}],comms:[{ts:1,day:3,kind:P,text:P,to:[P],earth:P}],
      formulary:{'med-acetaminophen':{mg:P,interval:6,maxDaily:9e99}},doses:[{id:P,mg:P,ts:P}],pharm:{'<b>':{qty:P,exp:P}},run:{id:P,steps:[P]}}))""", [KEY, P])
    for v in ["dashboard", "log", "trends", "library", "pharmacy", "guide"]:
        pg.goto(f"{BASE}/app.html#{v}"); pg.reload(); pg.wait_for_timeout(700)
    check("tampered storage cannot run code (even without CSP)", pg.evaluate("!window.__xss"))
    check("tampered storage does not crash the console", not [e for e in errs if e.startswith("JS")], errs)
    ctx.close()

    print("Resilience")
    # corrupted main record -> restored from backup
    ctx = b.new_context(); pg = ctx.new_page(); pg.goto(BASE + "/app.html"); pg.wait_for_timeout(1000)
    pg.evaluate(f"()=>{{const s=JSON.parse(localStorage.getItem('{KEY}'));s.name='Backup Crew';localStorage.setItem('{KEY}-backup',JSON.stringify(s));localStorage.setItem('{KEY}','{{broken json');}}")
    pg.reload(); pg.wait_for_timeout(1200)
    check("corrupted data is restored from backup", pg.input_value("#crewName") == "Backup Crew", pg.input_value("#crewName"))
    check("user is told about the recovery", "restored" in (pg.locator("#storeBar").inner_text() if pg.locator("#storeBar").count() else ""))
    ctx.close()
    # storage blocked entirely
    ctx = b.new_context(); ctx.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})")
    pg = ctx.new_page(); errs = page_errors(pg); pg.goto(BASE + "/app.html"); pg.wait_for_timeout(1500)
    check("console still works with storage blocked", pg.locator("#vgrid .vcard").count() == 12)
    check("user is warned that storage is blocked", pg.locator("#storeBar").count() == 1)
    ctx.close()
    # one broken panel does not take the rest down
    ctx = b.new_context(); ctx.add_init_script("new MutationObserver(()=>{const v=document.getElementById('radbox');if(v)v.id='radbox-gone';}).observe(document,{childList:true,subtree:true})")
    pg = ctx.new_page(); pg.goto(BASE + "/app.html"); pg.wait_for_timeout(1500)
    check("a failing panel shows the fault bar", pg.locator("#faultBar").count() == 1)
    check("other panels still render after a fault", pg.locator("#vgrid .vcard").count() == 12)
    ctx.close()
    # two tabs stay in sync
    ctx = b.new_context(); a = ctx.new_page(); a.goto(BASE + "/app.html"); a.wait_for_timeout(1000)
    c2 = ctx.new_page(); c2.goto(BASE + "/app.html"); c2.wait_for_timeout(1000)
    a.fill("#crewName", "Sync Test"); a.wait_for_timeout(600)
    check("a change in one tab appears in the other", c2.input_value("#crewName") == "Sync Test", c2.input_value("#crewName"))
    ctx.close()
    # offline
    ctx = b.new_context(); pg = ctx.new_page(); pg.goto(BASE + "/app.html"); pg.wait_for_timeout(2500)
    ctx.set_offline(True); pg.reload(); pg.wait_for_timeout(1500)
    check("console reloads with no network", pg.locator("#vgrid .vcard").count() == 12)
    pg.evaluate("location.hash='library'"); pg.wait_for_timeout(800)
    check("library works offline", pg.locator("#kbList .libitem").count() > 10)
    ctx.set_offline(False); ctx.close()

    print("Clinical logic")
    ctx = b.new_context(); pg = ctx.new_page(); errs = page_errors(pg); pg.goto(BASE + "/app.html"); pg.wait_for_timeout(1500)
    set_today(pg, hr=72, bp={"sys": 118, "dia": 76}, spo2=97, temp=38.4, glucose=90, hydration=2.2)
    t = open_med(pg, "Acetaminophen"); check("acetaminophen clear with normal vitals", "Clear to give" in t and "1000 mg" in t, t[:80])
    pg.click("[data-give]"); pg.wait_for_timeout(200)
    check("second dose blocked as too soon", "Too soon" in pg.locator(".dosebox").inner_text())
    set_today(pg, spo2=89); check("morphine blocked at SpO2 89", "Do not give now" in open_med(pg, "Morphine"))
    set_today(pg, spo2=97, bp={"sys": 96, "dia": 60}); check("nitroglycerin blocked at systolic 96", "Do not give now" in open_med(pg, "Nitroglycerin"))
    set_today(pg, hr=54, bp={"sys": 118, "dia": 76}); check("metoprolol blocked at HR 54", "Do not give now" in open_med(pg, "Metoprolol"))
    set_today(pg, hr=72, hydration=1.1); check("ibuprofen warns when dehydrated", "Caution" in open_med(pg, "Ibuprofen"))
    check("epinephrine never blocked", "Do not give now" not in open_med(pg, "Epinephrine"))
    pg.evaluate("""([k])=>{const s=JSON.parse(localStorage.getItem(k));Object.assign(s.days[s.days.length-1],{spo2:80,hr:140,bp:{sys:190,dia:120}});s.escSig='';localStorage.setItem(k,JSON.stringify(s));}""", [KEY])
    pg.reload(); pg.wait_for_timeout(1300)
    check("2+ Act now raises the crew alert on load", pg.locator("#escModal").is_visible())
    pg.keyboard.press("Escape")
    check("the alert is logged in crew comms", pg.locator("#comms .msg").count() > 0)
    check("clinical flows produced no JS errors", not [e for e in errs if e.startswith("JS")], errs)
    ctx.close()

    # optional accessibility scan (runs when axe-core is installed: npm i axe-core)
    axe = ROOT / "node_modules" / "axe-core" / "axe.min.js"
    if axe.exists():
        print("Accessibility")
        src = axe.read_text()
        for path in ["/", "/app.html", "/privacy.html"]:
            ctx = b.new_context(bypass_csp=True); pg = ctx.new_page(); pg.goto(BASE + path); pg.wait_for_timeout(1200)
            pg.add_script_tag(content=src)
            v = pg.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa']}).then(r=>r.violations.filter(x=>x.impact==='serious'||x.impact==='critical').map(x=>x.id))")
            check(f"{path} has no serious accessibility issues", not v, v); ctx.close()
    b.close()

srv.shutdown()
print(f"\n{PASSES} passed, {len(FAILS)} failed")
sys.exit(1 if FAILS else 0)
