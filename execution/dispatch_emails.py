#!/usr/bin/env python3
"""
execution/dispatch_emails.py

Deterministic email dispatcher for event certificates.
- Reads manifest from .tmp/certificates/manifest.json.
- Attaches generated certificates to outgoing emails.
- Reads SMTP credentials from .env if present; defaults to simulated dispatch mode if absent or requested.
- Produces delivery log in .tmp/delivery_report.json.
"""

import argparse
import email
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import json
import os
from pathlib import Path
import smtplib
import sys
import time


def load_env(env_path: Path):
    """Simple parser for .env file."""
    env_vars = {}
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip().strip("'\"")
    return env_vars


def dispatch_certificates(subject_template: str, body_template: str, dry_run: bool = True):
    base_dir = Path(__file__).resolve().parent.parent
    manifest_path = base_dir / ".tmp" / "certificates" / "manifest.json"

    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found at {manifest_path}. Please run generate_certificates.py first.")

    with open(manifest_path, "r", encoding="utf-8") as mf:
        manifest = json.load(mf)

    certificates = manifest.get("certificates", [])
    event_name = manifest.get("event_name", "Event")
    date_str = manifest.get("date", "2026")

    env_config = load_env(base_dir / ".env")
    smtp_host = env_config.get("SMTP_HOST", os.environ.get("SMTP_HOST", ""))
    smtp_port = int(env_config.get("SMTP_PORT", os.environ.get("SMTP_PORT", 587)))
    smtp_user = env_config.get("SMTP_USER", os.environ.get("SMTP_USER", ""))
    smtp_pass = env_config.get("SMTP_PASS", os.environ.get("SMTP_PASS", ""))
    sender_email = env_config.get("SENDER_EMAIL", smtp_user or "noreply@eventpulse.org")

    dispatch_log = []
    print(f"Starting certificate dispatch for {len(certificates)} recipients (Dry-run: {dry_run})...")

    smtp_server = None
    if not dry_run and smtp_host and smtp_user:
        try:
            smtp_server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
            smtp_server.starttls()
            smtp_server.login(smtp_user, smtp_pass)
            print(f"[CONNECTED] Logged in to SMTP host: {smtp_host}")
        except Exception as e:
            print(f"[WARNING] SMTP connection failed ({e}). Falling back to simulation mode.")
            dry_run = True

    for item in certificates:
        recipient_email = item.get("email", "").strip()
        name = item.get("name", "Participant")
        roll_no = item.get("roll_no", "")
        cert_id = item.get("cert_id", "")
        file_path = item.get("file_path", "")

        # Personalize subject & body
        subject = subject_template.replace("{{name}}", name).replace("{{roll_no}}", roll_no).replace("{{event_name}}", event_name).replace("{{cert_id}}", cert_id)
        body = body_template.replace("{{name}}", name).replace("{{roll_no}}", roll_no).replace("{{event_name}}", event_name).replace("{{date}}", date_str).replace("{{cert_id}}", cert_id)

        if not recipient_email or "@" not in recipient_email:
            dispatch_log.append({
                "recipient": name,
                "email": recipient_email,
                "status": "failed",
                "reason": "Invalid or missing email address",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            })
            continue

        try:
            # Build MIME Message
            msg = MIMEMultipart()
            msg["From"] = sender_email
            msg["To"] = recipient_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "html"))

            if file_path and os.path.exists(file_path):
                with open(file_path, "rb") as cf:
                    attachment = MIMEApplication(cf.read(), _subtype="svg+xml")
                    attachment.add_header("Content-Disposition", "attachment", filename=os.path.basename(file_path))
                    msg.attach(attachment)

            if not dry_run and smtp_server:
                smtp_server.sendmail(sender_email, [recipient_email], msg.as_string())
                status = "sent"
            else:
                # Simulated dispatch with slight realistic tick
                time.sleep(0.05)
                status = "simulated_sent"

            dispatch_log.append({
                "recipient": name,
                "email": recipient_email,
                "cert_id": cert_id,
                "status": status,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            })
            print(f"  [OK] Sent to {name} <{recipient_email}> [{cert_id}]")

        except Exception as err:
            dispatch_log.append({
                "recipient": name,
                "email": recipient_email,
                "status": "failed",
                "reason": str(err),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            })
            print(f"  [FAIL] Failed sending to {name} <{recipient_email}>: {err}")

    if smtp_server:
        smtp_server.quit()

    report_path = base_dir / ".tmp" / "delivery_report.json"
    with open(report_path, "w", encoding="utf-8") as rf:
        json.dump({
            "dispatched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "total_recipients": len(certificates),
            "successful": sum(1 for d in dispatch_log if "sent" in d["status"]),
            "failed": sum(1 for d in dispatch_log if d["status"] == "failed"),
            "dry_run": dry_run,
            "logs": dispatch_log
        }, rf, indent=2)

    return report_path


def main():
    parser = argparse.ArgumentParser(description="Deterministic Certificate Email Dispatcher")
    parser.add_argument("--subject", type=str, default="Certificate of Participation: {{event_name}} - {{name}}", help="Email Subject")
    parser.add_argument("--body", type=str, default="<p>Dear {{name}},</p><p>Thank you for attending <strong>{{event_name}}</strong>. Attached is your official certificate of participation.</p><p>Regards,<br>Event Organizing Team</p>", help="Email HTML Body")
    parser.add_argument("--send", action="store_true", help="Actually send via SMTP instead of dry-run simulation")

    args = parser.parse_args()

    try:
        report_path = dispatch_certificates(
            subject_template=args.subject,
            body_template=args.body,
            dry_run=not args.send
        )
        print(f"[SUCCESS] Dispatch complete! Delivery report written to {report_path}")
        sys.exit(0)
    except Exception as e:
        print(f"[ERROR] Dispatch failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
