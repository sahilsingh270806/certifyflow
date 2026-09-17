# Directive: Event Certificate Distribution Based on Attendance

## 1. Goal & Objective
Automate the end-to-end process of generating personalized event participation/merit certificates and distributing them via email specifically to attendees who met attendance criteria.

## 2. Inputs & Prerequisites
- **Certificate Template:** User-uploaded certificate background image (PNG, JPG, WebP, SVG) with calibrated visual coordinates for candidate name, roll number, event title, date, and certificate ID. Premade/canned templates removed in favor of dedicated user uploads.
- **Attendance Spreadsheet:** Excel (`.xlsx`, `.xls`) or CSV containing:
  - `Name`: Full name of participant
  - `Roll No` / `ID`: Unique student/participant identifier
  - `Email`: Valid destination email address
  - `Attendance`: Status (e.g. `Present`, `Absent`, or attendance percentage >= 75%)
- **Email Configuration:**
  - Sender display name, subject line with dynamic variables (e.g. `{{name}}`, `{{event_name}}`), and body template.
  - Optional SMTP credentials in `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`).

## 3. Tool & Execution Chain
1. **Interactive Web App (`index.html` & `app.js`):**
   - Launched via `python execution/serve.py`.
   - Guides the user through a 5-step wizard:
     1. Landing & Project Setup
     2. Template Upload & Visual Field Mapping
     3. Attendance Spreadsheet Ingestion & Filtering
     4. Email Template Drafting with Live Preview
     5. Bulk Certificate Rendering & Dispatch Simulation / SMTP Delivery
2. **Headless Python Execution Tools (for CLI or automated batching):**
   - `execution/generate_certificates.py`: Reads the roster, filters attendees by `Present`, draws text onto templates, and writes PDFs/PNGs to `.tmp/certificates/`.
   - `execution/dispatch_emails.py`: Reads generated certificates, constructs MIME messages with attachments, and sends via SMTP with retry and rate-limiting logic.

## 4. Expected Outputs
- **Intermediates:** `.tmp/certificates/*.png` and `.tmp/delivery_report.json`
- **Deliverables:**
  - Dispatched emails with personalized certificate attachments sent to eligible attendees.
  - Downloadable `.zip` archive of all generated certificates.
  - Delivery verification CSV log.

## 5. Edge Cases & Error Handling
- **Absent Attendees:** Automatically excluded from generation and email dispatch when attendance filter is active.
- **Malformed or Missing Email Addresses:** Flagged in table preview with warning badges and skipped during dispatch.
- **Long Names:** Dynamic font size clamping or truncation handling so names do not overflow certificate margins.
- **SMTP Rate Limits:** Built-in throttling delay (e.g. 500ms between emails) to prevent server blacklisting.

## 6. Self-Annealing Log
- `2026-09-17`: Initial directive created for automated attendance-based certificate distribution web application and execution scripts.
- `2026-09-17`: Simplified Step 2 template workflow — removed canned/premade certificate presets and Canva tabs. Shifted strictly to a dedicated user template image upload flow with dynamic canvas blueprint placeholder and upload status card.
