#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo ""
echo "================================================================"
echo "  LINDA — WIG Daily Revenue Operations"
printf "  %s\n" "$(date '+%A, %B %d, %Y — %I:%M %p')"
echo "================================================================"
echo ""

# ── 1. SMS Blast ──────────────────────────────────────────────────
echo "[ 1 / 3 ]  SMS BLAST"
python3 send_sms.py || echo "  [SMS skipped — check Twilio credentials or sms_contacts.csv]"
echo ""

# ── 2. Email Campaigns ────────────────────────────────────────────
echo "[ 2 / 3 ]  EMAIL CAMPAIGNS"
python3 send_emails.py --template inmate_welcome --audience inmate \
  || echo "  [inmate_welcome skipped]"
python3 send_emails.py --template lovefair_welcome --audience lovefair \
  || echo "  [lovefair_welcome skipped]"
echo ""

# ── 3. Revenue Sync ───────────────────────────────────────────────
echo "[ 3 / 3 ]  GUMROAD REVENUE"
python3 track_revenue.py || echo "  [Revenue sync skipped — check GUMROAD_ACCESS_TOKEN]"
echo ""

echo "================================================================"
echo "  Operation complete.  $(date '+%I:%M %p')"
echo "================================================================"
echo ""
