#!/usr/bin/env python3
"""
execution/serve.py

CertifyFlow Development & Dispatch Server.
- Serves static assets (index.html, styles.css, app.js).
- Provides live backend API endpoints for real SMTP email dispatch with certificate attachments.
- Reads and updates .env safely.
- Uses Python standard library only.
"""

import argparse
import base64
import email
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.utils import formataddr
import http.server
import json
import os
from pathlib import Path
import smtplib
import socketserver
import sys
import time

BASE_DIR = Path(__file__).resolve().parent.parent


def get_env_config():
    env_file = BASE_DIR / ".env"
    config = {}
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    config[k.strip()] = v.strip().strip("'\"")
    return config


def save_env_config(updates: dict):
    env_file = BASE_DIR / ".env"
    existing = {}
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    existing[k.strip()] = v.strip().strip("'\"")

    existing.update(updates)
    with open(env_file, "w", encoding="utf-8") as f:
        f.write("# CertifyFlow Environment Configuration\n")
        for k, v in existing.items():
            f.write(f"{k}={v}\n")


class AppHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json_response(self, code: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/get-config":
            cfg = get_env_config()
            self.send_json_response(200, {
                "smtp_host": cfg.get("SMTP_HOST", "smtp.gmail.com"),
                "smtp_port": int(cfg.get("SMTP_PORT", 587)),
                "smtp_user": cfg.get("SMTP_USER", ""),
                "has_pass": bool(cfg.get("SMTP_PASS")),
                "sender_name": cfg.get("SENDER_NAME", "Organizing Committee")
            })
            return
        super().do_GET()

    def do_POST(self):
        content_len = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_len) if content_len > 0 else b"{}"

        try:
            payload = json.loads(post_data.decode("utf-8"))
        except Exception:
            payload = {}

        if self.path == "/api/status":
            self.send_json_response(200, {"status": "active", "service": "CertifyFlow Dispatch Server"})

        elif self.path == "/api/save-env":
            smtp_host = payload.get("host", "").strip()
            smtp_port = str(payload.get("port", 587))
            smtp_user = payload.get("user", "").strip()
            smtp_pass = payload.get("pass", "").strip()
            sender_name = payload.get("sender_name", "").strip()

            updates = {
                "SMTP_HOST": smtp_host,
                "SMTP_PORT": smtp_port,
                "SMTP_USER": smtp_user,
                "SENDER_NAME": sender_name
            }
            if smtp_pass:
                updates["SMTP_PASS"] = smtp_pass

            save_env_config(updates)
            self.send_json_response(200, {"ok": True, "message": "Settings saved to .env"})

        elif self.path == "/api/test-connection":
            env_cfg = get_env_config()
            host = payload.get("host") or env_cfg.get("SMTP_HOST", "smtp.gmail.com")
            port = int(payload.get("port") or env_cfg.get("SMTP_PORT", 587))
            user = payload.get("user") or env_cfg.get("SMTP_USER", "")
            password = payload.get("pass") or env_cfg.get("SMTP_PASS", "")

            if not user or not password:
                self.send_json_response(400, {"ok": False, "error": "SMTP User and Password/App-Password are required."})
                return

            try:
                if port == 465:
                    server = smtplib.SMTP_SSL(host, port, timeout=12)
                else:
                    server = smtplib.SMTP(host, port, timeout=12)
                    server.starttls()

                server.login(user, password)
                server.quit()
                self.send_json_response(200, {
                    "ok": True,
                    "message": f"Successfully authenticated with {host}:{port} as {user}!"
                })
            except Exception as e:
                self.send_json_response(200, {
                    "ok": False,
                    "error": f"SMTP Authentication failed: {str(e)}"
                })

        elif self.path == "/api/send-email":
            env_cfg = get_env_config()
            smtp_info = payload.get("smtp", {})
            host = smtp_info.get("host") or env_cfg.get("SMTP_HOST", "smtp.gmail.com")
            port = int(smtp_info.get("port") or env_cfg.get("SMTP_PORT", 587))
            user = smtp_info.get("user") or env_cfg.get("SMTP_USER", "")
            password = smtp_info.get("pass") or env_cfg.get("SMTP_PASS", "")
            sender_name = smtp_info.get("sender_name") or env_cfg.get("SENDER_NAME", user)

            recipient = payload.get("recipient", {})
            recipient_email = recipient.get("email", "").strip()
            recipient_name = recipient.get("name", "Participant")
            subject = payload.get("subject", "Certificate of Participation")
            body_html = payload.get("body", "")

            attachment_base64 = payload.get("attachment_base64", "")
            attachment_filename = payload.get("attachment_filename", "Certificate.png")

            if not recipient_email or "@" not in recipient_email:
                self.send_json_response(400, {"ok": False, "error": "Invalid recipient email address"})
                return

            if not user or not password:
                self.send_json_response(400, {"ok": False, "error": "Missing SMTP credentials in configuration"})
                return

            try:
                msg = MIMEMultipart("mixed")
                msg["From"] = formataddr((sender_name, user))
                msg["To"] = formataddr((recipient_name, recipient_email))
                msg["Subject"] = subject

                # HTML Body with fallback plaintext
                body_part = MIMEMultipart("alternative")
                body_part.attach(MIMEText(body_html.replace("<br>", "\n"), "plain"))
                # Convert newlines to breaks if raw text
                formatted_html = body_html.replace("\n", "<br>") if "<p>" not in body_html else body_html
                body_part.attach(MIMEText(formatted_html, "html"))
                msg.attach(body_part)

                # Attach certificate image
                if attachment_base64:
                    raw_b64 = attachment_base64
                    if "base64," in raw_b64:
                        raw_b64 = raw_b64.split("base64,")[1]
                    file_bytes = base64.b64decode(raw_b64)
                    att = MIMEApplication(file_bytes, _subtype="png")
                    att.add_header("Content-Disposition", "attachment", filename=attachment_filename)
                    msg.attach(att)

                # Connect and send
                if port == 465:
                    server = smtplib.SMTP_SSL(host, port, timeout=20)
                else:
                    server = smtplib.SMTP(host, port, timeout=20)
                    server.starttls()

                server.login(user, password)
                server.sendmail(user, [recipient_email], msg.as_string())
                server.quit()

                # Log sent email into .tmp/delivery_report.json
                log_dir = BASE_DIR / ".tmp"
                log_dir.mkdir(parents=True, exist_ok=True)
                report_file = log_dir / "delivery_report.json"
                report_data = {"logs": []}
                if report_file.exists():
                    try:
                        with open(report_file, "r", encoding="utf-8") as rf:
                            report_data = json.load(rf)
                    except Exception:
                        pass

                report_data["logs"].append({
                    "recipient": recipient_name,
                    "email": recipient_email,
                    "status": "SENT_VIA_SMTP",
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                })
                with open(report_file, "w", encoding="utf-8") as rf:
                    json.dump(report_data, rf, indent=2)

                self.send_json_response(200, {
                    "ok": True,
                    "message": f"Delivered email with certificate to {recipient_email}"
                })

            except Exception as e:
                self.send_json_response(200, {
                    "ok": False,
                    "error": f"Failed sending to {recipient_email}: {str(e)}"
                })

        else:
            self.send_response(404)
            self.end_headers()


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def run_server(port: int = 8080):
    handler = AppHandler
    with ReusableTCPServer(("0.0.0.0", port), handler) as httpd:
        print(f"[CERTIFYFLOW SERVER RUNNING] http://0.0.0.0:{port} (Public / Cloud Ready)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")


def main():
    default_port = int(os.environ.get("PORT", 8080))
    parser = argparse.ArgumentParser(description="Serve the Certificate Distribution Web App")
    parser.add_argument("--port", type=int, default=default_port, help=f"Port to listen on (default {default_port})")
    args = parser.parse_args()
    run_server(args.port)


if __name__ == "__main__":
    main()

