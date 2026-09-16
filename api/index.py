import base64
import email
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.utils import formataddr
from http.server import BaseHTTPRequestHandler
import json
import os
import smtplib
import time


class handler(BaseHTTPRequestHandler):

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, code: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        clean_path = self.path.split("?")[0].rstrip("/")

        if clean_path in ("/api/get-config", "/get-config"):
            self.send_json(200, {
                "smtp_host": os.environ.get("SMTP_HOST", "smtp.gmail.com"),
                "smtp_port": int(os.environ.get("SMTP_PORT", 587)),
                "smtp_user": os.environ.get("SMTP_USER", ""),
                "has_pass": bool(os.environ.get("SMTP_PASS")),
                "sender_name": os.environ.get("SENDER_NAME", "Organizing Committee")
            })
        elif clean_path in ("/api/status", "/status"):
            self.send_json(200, {
                "status": "active",
                "platform": "Vercel Serverless Function",
                "service": "CertifyFlow"
            })
        else:
            self.send_json(404, {"error": "Endpoint not found"})

    def do_POST(self):
        clean_path = self.path.split("?")[0].rstrip("/")
        content_len = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_len) if content_len > 0 else b"{}"

        try:
            payload = json.loads(post_data.decode("utf-8"))
        except Exception:
            payload = {}

        if clean_path in ("/api/test-connection", "/test-connection"):
            host = payload.get("host") or os.environ.get("SMTP_HOST", "smtp.gmail.com")
            port = int(payload.get("port") or os.environ.get("SMTP_PORT", 587))
            user = payload.get("user") or os.environ.get("SMTP_USER", "")
            password = payload.get("pass") or os.environ.get("SMTP_PASS", "")

            if not user or not password:
                self.send_json(400, {"ok": False, "error": "SMTP User and Password/App-Password are required."})
                return

            try:
                if port == 465:
                    server = smtplib.SMTP_SSL(host, port, timeout=12)
                else:
                    server = smtplib.SMTP(host, port, timeout=12)
                    server.starttls()

                server.login(user, password)
                server.quit()
                self.send_json(200, {
                    "ok": True,
                    "message": f"Successfully authenticated with {host}:{port} as {user}!"
                })
            except Exception as e:
                self.send_json(200, {
                    "ok": False,
                    "error": f"SMTP Authentication failed: {str(e)}"
                })

        elif clean_path in ("/api/send-email", "/send-email"):
            smtp_info = payload.get("smtp", {})
            host = smtp_info.get("host") or os.environ.get("SMTP_HOST", "smtp.gmail.com")
            port = int(smtp_info.get("port") or os.environ.get("SMTP_PORT", 587))
            user = smtp_info.get("user") or os.environ.get("SMTP_USER", "")
            password = smtp_info.get("pass") or os.environ.get("SMTP_PASS", "")
            sender_name = smtp_info.get("sender_name") or os.environ.get("SENDER_NAME", user)

            recipient = payload.get("recipient", {})
            recipient_email = recipient.get("email", "").strip()
            recipient_name = recipient.get("name", "Participant")
            subject = payload.get("subject", "Certificate of Participation")
            body_html = payload.get("body", "")

            attachment_base64 = payload.get("attachment_base64", "")
            attachment_filename = payload.get("attachment_filename", "Certificate.png")

            if not recipient_email or "@" not in recipient_email:
                self.send_json(400, {"ok": False, "error": "Invalid recipient email address"})
                return

            if not user or not password:
                self.send_json(400, {"ok": False, "error": "Missing SMTP credentials in configuration"})
                return

            try:
                msg = MIMEMultipart("mixed")
                msg["From"] = formataddr((sender_name, user))
                msg["To"] = formataddr((recipient_name, recipient_email))
                msg["Subject"] = subject

                # HTML and Plaintext body
                body_part = MIMEMultipart("alternative")
                body_part.attach(MIMEText(body_html.replace("<br>", "\n"), "plain"))
                formatted_html = body_html.replace("\n", "<br>") if "<p>" not in body_html else body_html
                body_part.attach(MIMEText(formatted_html, "html"))
                msg.attach(body_part)

                # Attach certificate
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

                self.send_json(200, {
                    "ok": True,
                    "message": f"Delivered email with certificate to {recipient_email}"
                })

            except Exception as e:
                self.send_json(200, {
                    "ok": False,
                    "error": f"Failed sending to {recipient_email}: {str(e)}"
                })

        elif clean_path in ("/api/save-env", "/save-env"):
            # Serverless environments are read-only; indicate success
            self.send_json(200, {
                "ok": True,
                "message": "In Vercel, credentials can also be permanently stored in Project Settings > Environment Variables."
            })

        else:
            self.send_json(404, {"error": "Endpoint not found"})
