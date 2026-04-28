import smtplib
import csv
import os
import time
import imaplib
import email as email_lib
import argparse
from datetime import datetime, date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

GMAIL_ADDRESS      = os.environ.get('GMAIL_ADDRESS', '')
GMAIL_APP_PASSWORD = os.environ.get('GMAIL_APP_PASSWORD', '')
DAILY_LIMIT        = 500
SEND_DELAY         = 0.5  # seconds between sends — stays within Gmail free tier

CONTACTS_FILE  = 'contacts.csv'
LOG_FILE       = 'email_log.csv'
OPTOUTS_FILE   = 'optouts.csv'
TEMPLATES_DIR  = 'templates'

SUBJECTS = {
    'inmate_welcome':  "You're in. Here's what most people never know.",
    'inmate_offer':    "The Inmate Traveler's Guide — $27 Bundle (limited)",
    'inmate_urgency':  "Founding member offer closes at 50 — you're on the list",
    'lovefair_welcome': "Modern dating is not broken. You are.",
    'lovefair_offer':  "Modern Lovefair — $27 Bundle for serious men",
    'lovefair_urgency': "First 50 founding members — you qualify",
}


def load_optouts():
    optouts = set()
    if not Path(OPTOUTS_FILE).exists():
        return optouts
    with open(OPTOUTS_FILE, newline='') as f:
        for row in csv.DictReader(f):
            val = row.get('email', '').lower().strip()
            if val:
                optouts.add(val)
    return optouts


def add_optout(email_addr, source='unsubscribe_reply'):
    exists = Path(OPTOUTS_FILE).exists()
    with open(OPTOUTS_FILE, 'a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['email', 'phone', 'timestamp', 'source'])
        if not exists:
            writer.writeheader()
        writer.writerow({
            'email':     email_addr.lower().strip(),
            'phone':     '',
            'timestamp': datetime.now().isoformat(),
            'source':    source,
        })


def check_unsubscribes():
    """Poll Gmail inbox via IMAP for UNSUBSCRIBE replies and log them."""
    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        return
    try:
        mail = imaplib.IMAP4_SSL('imap.gmail.com')
        mail.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
        mail.select('inbox')
        _, data = mail.search(None, 'UNSEEN SUBJECT "UNSUBSCRIBE"')
        for num in data[0].split():
            _, msg_data = mail.fetch(num, '(RFC822)')
            msg = email_lib.message_from_bytes(msg_data[0][1])
            sender = email_lib.utils.parseaddr(msg.get('From', ''))[1]
            if sender:
                add_optout(sender)
                print(f'  Unsubscribe logged: {sender}')
            mail.store(num, '+FLAGS', '\\Seen')
        mail.logout()
    except Exception as e:
        print(f'  [IMAP check skipped: {e}]')


def load_sent_today(template):
    sent = set()
    if not Path(LOG_FILE).exists():
        return sent
    today = date.today().isoformat()
    with open(LOG_FILE, newline='') as f:
        for row in csv.DictReader(f):
            if row.get('template') == template and row.get('timestamp', '').startswith(today):
                sent.add(row.get('email', '').lower().strip())
    return sent


def count_sent_today():
    if not Path(LOG_FILE).exists():
        return 0
    today = date.today().isoformat()
    return sum(
        1 for row in csv.DictReader(open(LOG_FILE, newline=''))
        if row.get('timestamp', '').startswith(today) and row.get('status') == 'sent'
    )


def log_send(email_addr, template, status, book):
    exists = Path(LOG_FILE).exists()
    with open(LOG_FILE, 'a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['timestamp', 'email', 'template', 'status', 'book'])
        if not exists:
            writer.writeheader()
        writer.writerow({
            'timestamp': datetime.now().isoformat(),
            'email':     email_addr,
            'template':  template,
            'status':    status,
            'book':      book,
        })


def load_template(name):
    path = Path(TEMPLATES_DIR) / f'{name}.html'
    with open(path) as f:
        return f.read()


def render(html, name, email_addr):
    replacements = {
        '{{name}}':                   name,
        '{{email}}':                  email_addr,
        '{{unsubscribe_email}}':      GMAIL_ADDRESS,
        '{{INMATE_GUIDE_GUMROAD_URL}}': os.environ.get('INMATE_GUIDE_GUMROAD_URL', '#'),
        '{{LOVEFAIR_GUMROAD_URL}}':   os.environ.get('LOVEFAIR_GUMROAD_URL', '#'),
    }
    for token, value in replacements.items():
        html = html.replace(token, value)
    return html


def send_campaign(template_name, audience_filter=None):
    book = 'inmate' if 'inmate' in template_name else 'lovefair'
    subject = SUBJECTS.get(template_name, 'A message from Bishop Watkins')

    print(f'\nCampaign: {template_name}  |  Audience: {audience_filter or "all"}')

    check_unsubscribes()
    optouts          = load_optouts()
    already_sent     = load_sent_today(template_name)
    daily_used       = count_sent_today()
    template_html    = load_template(template_name)

    contacts = []
    with open(CONTACTS_FILE, newline='') as f:
        contacts = list(csv.DictReader(f))

    sent_count = 0

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.ehlo()
        server.starttls()
        server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
    except Exception as e:
        print(f'  SMTP connection failed: {e}')
        return

    for contact in contacts:
        if daily_used + sent_count >= DAILY_LIMIT:
            print(f'  Daily limit of {DAILY_LIMIT} reached.')
            break

        email_addr = contact.get('email', '').lower().strip()
        name       = contact.get('name', 'Friend').strip()
        audience   = contact.get('audience', '').lower().strip()

        if audience_filter and audience != audience_filter:
            continue
        if email_addr in optouts:
            continue
        if email_addr in already_sent:
            continue

        try:
            body = render(template_html, name, email_addr)

            msg = MIMEMultipart('alternative')
            msg['Subject']         = subject
            msg['From']            = f'Bishop Watkins <{GMAIL_ADDRESS}>'
            msg['To']              = email_addr
            msg['List-Unsubscribe'] = f'<mailto:{GMAIL_ADDRESS}?subject=UNSUBSCRIBE>'
            msg.attach(MIMEText(body, 'html'))

            server.sendmail(GMAIL_ADDRESS, email_addr, msg.as_string())
            log_send(email_addr, template_name, 'sent', book)
            sent_count += 1
            print(f'  Sent → {email_addr}')
            time.sleep(SEND_DELAY)

        except Exception as e:
            log_send(email_addr, template_name, f'error: {str(e)[:100]}', book)
            print(f'  Failed → {email_addr}: {e}')

    server.quit()
    print(f'  Done. {sent_count} sent.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Linda Email Sender')
    parser.add_argument('--template', required=True,
                        help='Template name (e.g. inmate_welcome)')
    parser.add_argument('--audience', default=None,
                        help='Filter by audience column value (e.g. inmate, lovefair, family)')
    args = parser.parse_args()
    send_campaign(args.template, args.audience)
