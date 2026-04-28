import csv
import json
import os
import urllib.request
import urllib.error
from datetime import datetime, date
from pathlib import Path

GUMROAD_ACCESS_TOKEN = os.environ.get('GUMROAD_ACCESS_TOKEN', '')
INMATE_GUIDE_URL     = os.environ.get('INMATE_GUIDE_GUMROAD_URL', '')
LOVEFAIR_URL         = os.environ.get('LOVEFAIR_GUMROAD_URL', '')

REVENUE_LOG = 'revenue_log.csv'


def product_id_from_url(url):
    if not url:
        return None
    return url.rstrip('/').split('/')[-1] or None


def fetch_sales_page(page=1):
    url = f'https://api.gumroad.com/v2/sales?page={page}'
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {GUMROAD_ACCESS_TOKEN}')
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode('utf-8'))


def load_logged_ids():
    if not Path(REVENUE_LOG).exists():
        return set()
    with open(REVENUE_LOG, newline='') as f:
        return {row.get('sale_id', '') for row in csv.DictReader(f) if row.get('sale_id')}


def classify_book(sale, inmate_id, lovefair_id):
    pid  = sale.get('product_id', '') or ''
    name = (sale.get('product_name', '') or '').lower()
    if inmate_id and pid == inmate_id:
        return 'inmate'
    if lovefair_id and pid == lovefair_id:
        return 'lovefair'
    if any(kw in name for kw in ('inmate', "traveler's guide", 'traveler guide')):
        return 'inmate'
    if any(kw in name for kw in ('lovefair', 'modern love', 'interpersonal blueprint')):
        return 'lovefair'
    return 'other'


def parse_amount(sale):
    raw = sale.get('price', 0)
    try:
        val = float(raw)
        # Gumroad returns cents for some endpoints, dollars for others.
        # Values >= 100 that are round numbers are likely cents.
        return val / 100 if val >= 100 and val == int(val) else val
    except (ValueError, TypeError):
        return 0.0


def log_sale(sale, book):
    exists = Path(REVENUE_LOG).exists()
    with open(REVENUE_LOG, 'a', newline='') as f:
        writer = csv.DictWriter(
            f, fieldnames=['timestamp', 'sale_id', 'product', 'amount', 'buyer_email', 'book']
        )
        if not exists:
            writer.writeheader()
        writer.writerow({
            'timestamp':   sale.get('created_at', datetime.now().isoformat()),
            'sale_id':     sale.get('id', ''),
            'product':     sale.get('product_name', ''),
            'amount':      f'{parse_amount(sale):.2f}',
            'buyer_email': sale.get('email', ''),
            'book':        book,
        })


def pull_revenue():
    if not GUMROAD_ACCESS_TOKEN:
        print('  GUMROAD_ACCESS_TOKEN not set — skipping API pull.')
        print_summary()
        return

    inmate_id  = product_id_from_url(INMATE_GUIDE_URL)
    lovefair_id = product_id_from_url(LOVEFAIR_URL)
    logged     = load_logged_ids()
    new_count  = 0
    page       = 1

    while True:
        try:
            data = fetch_sales_page(page)
        except urllib.error.HTTPError as e:
            print(f'  Gumroad API error {e.code}: {e.reason}')
            break
        except Exception as e:
            print(f'  Gumroad connection error: {e}')
            break

        if not data.get('success'):
            print(f"  Gumroad API failure: {data.get('message', 'unknown')}")
            break

        sales = data.get('sales', [])
        if not sales:
            break

        for sale in sales:
            sid = sale.get('id', '')
            if sid in logged:
                continue
            book = classify_book(sale, inmate_id, lovefair_id)
            log_sale(sale, book)
            logged.add(sid)
            new_count += 1

        if not data.get('next_page_url'):
            break
        page += 1

    print(f'  {new_count} new transaction(s) logged.')
    print_summary()


def print_summary():
    if not Path(REVENUE_LOG).exists():
        print('\n  No revenue data yet.\n')
        return

    today = date.today().isoformat()
    books = ['inmate', 'lovefair', 'other']

    totals  = {b: 0.0 for b in books}
    counts  = {b: 0   for b in books}
    t_today = {b: 0.0 for b in books}
    c_today = {b: 0   for b in books}

    with open(REVENUE_LOG, newline='') as f:
        for row in csv.DictReader(f):
            b = row.get('book', 'other')
            if b not in books:
                b = 'other'
            try:
                amt = float(row.get('amount', 0))
            except ValueError:
                amt = 0.0
            totals[b]  += amt
            counts[b]  += 1
            if row.get('timestamp', '').startswith(today):
                t_today[b] += amt
                c_today[b] += 1

    width = 52
    bar   = '=' * width

    print(f'\n{bar}')
    print(f"  REVENUE SUMMARY — {date.today().strftime('%B %d, %Y')}")
    print(bar)
    print(f'\n  TODAY')
    print(f"  The Inmate Traveler's Guide   ${t_today['inmate']:>8.2f}   ({c_today['inmate']} sales)")
    print(f"  Modern Lovefair               ${t_today['lovefair']:>8.2f}   ({c_today['lovefair']} sales)")
    if t_today['other'] > 0:
        print(f"  Other                         ${t_today['other']:>8.2f}   ({c_today['other']} sales)")
    print(f"  {'─' * (width - 2)}")
    print(f"  Today combined                ${sum(t_today.values()):>8.2f}")

    print(f'\n  ALL TIME')
    print(f"  The Inmate Traveler's Guide   ${totals['inmate']:>8.2f}   ({counts['inmate']} sales)")
    print(f"  Modern Lovefair               ${totals['lovefair']:>8.2f}   ({counts['lovefair']} sales)")
    if totals['other'] > 0:
        print(f"  Other                         ${totals['other']:>8.2f}   ({counts['other']} sales)")
    print(f"  {'─' * (width - 2)}")
    print(f"  All time combined             ${sum(totals.values()):>8.2f}")
    print(f'\n{bar}\n')


if __name__ == '__main__':
    pull_revenue()
