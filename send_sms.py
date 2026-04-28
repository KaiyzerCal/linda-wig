import csv
import os
import time
from datetime import datetime
from pathlib import Path

from twilio.rest import Client

TWILIO_ACCOUNT_SID  = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN   = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER', '')

SMS_CONTACTS_FILE = 'sms_contacts.csv'
SMS_LOG_FILE      = 'sms_log.csv'
OPTOUTS_FILE      = 'optouts.csv'
CONTACTS_FILE     = 'contacts.csv'

SEND_DELAY = 1  # 1 second between sends — carrier rate limit compliance

MESSAGES = {
    'inmate': (
        "Bishop Watkins here. I wrote the book I needed when I walked through those gates. "
        "The Inmate Traveler's Guide is out now — paperback $12.99. "
        "Written for you first: {INMATE_URL} "
        "Reply YES for more. Reply STOP to opt out."
    ),
    'family': (
        "When an inmate does time, the people who love them do time too. "
        "The Inmate Traveler's Guide is for you as much as for them. "
        "Bishop Watkins: {INMATE_URL} "
        "Reply YES for more. Reply STOP to opt out."
    ),
    'lovefair': (
        "Modern dating is not broken. People are. "
        "Modern Lovefair — the internal architecture of desire. "
        "By Christopher Bishop Watkins: {LOVEFAIR_URL} "
        "Reply YES for more. Reply STOP to opt out."
    ),
    'general': (
        "Two books. One author. Bishop Watkins writes from the inside out. "
        "The Inmate Traveler's Guide + Modern Lovefair. "
        "Start here: {INMATE_URL} "
        "Reply YES for more. Reply STOP to opt out."
    ),
}


def load_optout_phones():
    phones = set()
    if not Path(OPTOUTS_FILE).exists():
        return phones
    with open(OPTOUTS_FILE, newline='') as f:
        for row in csv.DictReader(f):
            val = row.get('phone', '').strip()
            if val:
                phones.add(val)
    return phones


def add_optout_phone(phone):
    exists = Path(OPTOUTS_FILE).exists()
    with open(OPTOUTS_FILE, 'a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['email', 'phone', 'timestamp', 'source'])
        if not exists:
            writer.writeheader()
        writer.writerow({
            'email':     '',
            'phone':     phone,
            'timestamp': datetime.now().isoformat(),
            'source':    'sms_stop',
        })


def add_yes_to_email_list(name, phone):
    """Mark YES responders in contacts.csv for email follow-up.
    Email field is a placeholder — replace with real address when collected."""
    exists = Path(CONTACTS_FILE).exists()
    with open(CONTACTS_FILE, 'a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['name', 'email', 'audience'])
        if not exists:
            writer.writeheader()
        writer.writerow({
            'name':     name,
            'email':    f'sms_yes_{phone.replace("+", "").replace(" ", "")}@pending.wig',
            'audience': 'general',
        })


def log_sms(phone, name, status, book, preview):
    exists = Path(SMS_LOG_FILE).exists()
    with open(SMS_LOG_FILE, 'a', newline='') as f:
        writer = csv.DictWriter(
            f, fieldnames=['timestamp', 'phone', 'name', 'status', 'book', 'message_preview']
        )
        if not exists:
            writer.writeheader()
        writer.writerow({
            'timestamp':       datetime.now().isoformat(),
            'phone':           phone,
            'name':            name,
            'status':          status,
            'book':            book,
            'message_preview': preview[:100],
        })


def process_replies(client):
    """Poll Twilio for incoming messages and handle YES / STOP."""
    try:
        messages = client.messages.list(to=TWILIO_PHONE_NUMBER, limit=100)
        for msg in messages:
            body  = (msg.body or '').strip().upper()
            phone = msg.from_
            if 'STOP' in body:
                add_optout_phone(phone)
                print(f'  STOP from {phone} — added to optouts')
            elif 'YES' in body:
                add_yes_to_email_list('SMS Contact', phone)
                print(f'  YES from {phone} — added to email list')
    except Exception as e:
        print(f'  [Reply check skipped: {e}]')


def run_sms_blast():
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_PHONE_NUMBER:
        print('  Twilio credentials missing. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.')
        return

    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

    print('\nProcessing replies before blast...')
    process_replies(client)

    optout_phones = load_optout_phones()

    inmate_url  = os.environ.get('INMATE_GUIDE_GUMROAD_URL', '#')
    lovefair_url = os.environ.get('LOVEFAIR_GUMROAD_URL', '#')

    contacts = []
    with open(SMS_CONTACTS_FILE, newline='') as f:
        contacts = list(csv.DictReader(f))

    sent_count = 0

    for contact in contacts:
        phone    = contact.get('phone', '').strip()
        name     = contact.get('name', 'Friend').strip()
        audience = contact.get('audience', 'general').lower().strip()
        book     = contact.get('book', 'general').lower().strip()

        if not phone:
            continue
        if phone in optout_phones:
            continue

        template = MESSAGES.get(audience, MESSAGES['general'])
        body = (template
                .replace('{INMATE_URL}', inmate_url)
                .replace('{LOVEFAIR_URL}', lovefair_url)
                .replace('{name}', name))

        try:
            client.messages.create(
                body=body,
                from_=TWILIO_PHONE_NUMBER,
                to=phone,
            )
            log_sms(phone, name, 'sent', book, body)
            sent_count += 1
            print(f'  SMS sent → {phone} ({audience})')
            time.sleep(SEND_DELAY)

        except Exception as e:
            log_sms(phone, name, f'error: {str(e)[:100]}', book, body)
            print(f'  SMS failed → {phone}: {e}')

    print(f'\nSMS blast complete. {sent_count} sent.')


if __name__ == '__main__':
    run_sms_blast()
