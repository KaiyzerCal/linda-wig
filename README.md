# WIG Revenue System — Setup Guide

Two books. Two campaigns. One command runs everything.

---

## Step 1 — Copy and fill the environment file

```bash
cp .env.example .env
```

Open `.env` and fill in each value:

**Gmail app password**
Go to myaccount.google.com → Security → 2-Step Verification → App passwords.
Create one named "WIG Linda." Paste the 16-character password into `GMAIL_APP_PASSWORD`.
Set `GMAIL_ADDRESS` to your Gmail address.

**Twilio credentials**
Log in at twilio.com/console. Your Account SID and Auth Token are on the dashboard.
`TWILIO_PHONE_NUMBER` is the number you purchased in Twilio (format: +15551234567).

**Gumroad access token**
Log in at gumroad.com → Settings → Advanced → Access token.
Generate one and paste it into `GUMROAD_ACCESS_TOKEN`.

**Gumroad product URLs**
Open each product in your Gumroad dashboard. Copy the full product page URL.
Paste into `INMATE_GUIDE_GUMROAD_URL` and `LOVEFAIR_GUMROAD_URL`.

---

## Step 2 — Install dependencies

```bash
pip3 install twilio
```

---

## Step 3 — Add real contacts

Replace the sample rows in `contacts.csv` with real subscribers.
Columns: `name`, `email`, `audience` (values: `inmate`, `family`, `lovefair`, `general`)

Replace the sample rows in `sms_contacts.csv` with real phone numbers.
Columns: `name`, `phone`, `audience`, `book`
Phone numbers must be in E.164 format: +15551234567

---

## Step 4 — Run the system

```bash
./run_linda.sh
```

To automate daily at 8am, add to cron:

```bash
crontab -e
# Add this line:
0 8 * * * /path/to/linda-wig/run_linda.sh >> /path/to/linda-wig/linda.log 2>&1
```

---

## Send a specific email campaign manually

```bash
python3 send_emails.py --template inmate_offer --audience inmate
python3 send_emails.py --template lovefair_urgency --audience lovefair
```

Available templates: `inmate_welcome`, `inmate_offer`, `inmate_urgency`, `lovefair_welcome`, `lovefair_offer`, `lovefair_urgency`

---

## Check revenue at any time

```bash
python3 track_revenue.py
```
