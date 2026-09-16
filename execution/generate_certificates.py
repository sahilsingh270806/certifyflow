#!/usr/bin/env python3
"""
execution/generate_certificates.py

Deterministic certificate generator.
- Ingests attendee roster (CSV or JSON).
- Filters participants based on attendance criteria (default: status == 'Present').
- Generates individualized certificates into .tmp/certificates/.
- Standard library only (zero external pip packages required).
"""

import argparse
import csv
import json
import os
import sys
import uuid
from pathlib import Path


def create_svg_certificate(name: str, roll_no: str, event_name: str, date_str: str, cert_id: str) -> str:
    """Generates a crisp, vector-grade SVG certificate template."""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 850" width="1200" height="850">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#090d16" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="50%" stop-color="#a855f7" />
      <stop offset="100%" stop-color="#ec4899" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="850" fill="url(#bgGrad)" />

  <!-- Outer & Inner Borders -->
  <rect x="30" y="30" width="1140" height="790" rx="16" fill="none" stroke="url(#goldGrad)" stroke-width="2" opacity="0.6" />
  <rect x="45" y="45" width="1110" height="760" rx="12" fill="none" stroke="url(#accentGrad)" stroke-width="1" opacity="0.4" />

  <!-- Corner Ornaments -->
  <path d="M 55,95 L 55,55 L 95,55" fill="none" stroke="url(#goldGrad)" stroke-width="4" stroke-linecap="round" />
  <path d="M 1145,95 L 1145,55 L 1105,55" fill="none" stroke="url(#goldGrad)" stroke-width="4" stroke-linecap="round" />
  <path d="M 55,755 L 55,795 L 95,795" fill="none" stroke="url(#goldGrad)" stroke-width="4" stroke-linecap="round" />
  <path d="M 1145,755 L 1145,795 L 1105,795" fill="none" stroke="url(#goldGrad)" stroke-width="4" stroke-linecap="round" />

  <!-- Header Badge & Organization -->
  <text x="600" y="140" font-family="'Cinzel', 'Playfair Display', Georgia, serif" font-size="16" letter-spacing="6" fill="#94a3b8" text-anchor="middle" font-weight="600">OFFICIAL EVENT VERIFICATION</text>
  <text x="600" y="210" font-family="'Cinzel', 'Playfair Display', Georgia, serif" font-size="44" font-weight="700" letter-spacing="4" fill="url(#goldGrad)" text-anchor="middle" filter="url(#glow)">CERTIFICATE OF PARTICIPATION</text>
  <line x1="450" y1="235" x2="750" y2="235" stroke="url(#accentGrad)" stroke-width="2" stroke-linecap="round" />

  <!-- Subtitle -->
  <text x="600" y="290" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="18" fill="#cbd5e1" text-anchor="middle">PROUDLY AND FORMALLY PRESENTED TO</text>

  <!-- Candidate Name -->
  <text x="600" y="380" font-family="'Playfair Display', Georgia, serif" font-size="52" font-weight="700" fill="#ffffff" text-anchor="middle">{name}</text>
  <line x1="320" y1="405" x2="880" y2="405" stroke="#334155" stroke-width="1.5" />

  <!-- Candidate Roll / ID -->
  <text x="600" y="445" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle">ROLL NO / REGISTRATION ID: <tspan fill="#f1f5f9" font-weight="600">{roll_no}</tspan></text>

  <!-- Description Body -->
  <text x="600" y="505" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="18" fill="#cbd5e1" text-anchor="middle">for exemplary and active attendance in the technical conference</text>
  <text x="600" y="545" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="28" font-weight="700" fill="url(#accentGrad)" text-anchor="middle">{event_name}</text>

  <!-- Signatures & Verification Details -->
  <g transform="translate(180, 680)">
    <line x1="0" y1="0" x2="220" y2="0" stroke="#475569" stroke-width="1" />
    <text x="110" y="25" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">DATE OF ISSUANCE</text>
    <text x="110" y="50" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="15" fill="#f8fafc" font-weight="600" text-anchor="middle">{date_str}</text>
  </g>

  <!-- Central Seal -->
  <g transform="translate(600, 675)">
    <circle r="40" fill="none" stroke="url(#goldGrad)" stroke-width="2" />
    <circle r="34" fill="#1e293b" opacity="0.8" />
    <polygon points="600,645 610,670 635,670 615,685 622,710 600,695 578,710 585,685 565,670 590,670" fill="url(#goldGrad)" transform="translate(-600, -675)" />
  </g>

  <g transform="translate(800, 680)">
    <line x1="0" y1="0" x2="220" y2="0" stroke="#475569" stroke-width="1" />
    <text x="110" y="25" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">AUTHORIZED SIGNATURE</text>
    <text x="110" y="50" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="15" fill="#f8fafc" font-weight="600" text-anchor="middle">Convener & Chair</text>
  </g>

  <!-- Certificate ID Footer -->
  <text x="600" y="780" font-family="'Plus Jakarta Sans', monospace, sans-serif" font-size="12" letter-spacing="2" fill="#64748b" text-anchor="middle">CERTIFICATE ID: {cert_id} &bull; VERIFIED SECURE</text>
</svg>"""


def generate_certificates(roster_path: str, event_name: str, date_str: str, filter_present: bool = True):
    base_dir = Path(__file__).resolve().parent.parent
    tmp_cert_dir = base_dir / ".tmp" / "certificates"
    tmp_cert_dir.mkdir(parents=True, exist_ok=True)

    roster_file = Path(roster_path)
    if not roster_file.is_absolute():
        roster_file = base_dir / roster_file

    if not roster_file.exists():
        raise FileNotFoundError(f"Roster file not found: {roster_file}")

    attendees = []
    if roster_file.suffix.lower() in [".csv", ".txt"]:
        with open(roster_file, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # normalize key names
                normalized = {k.strip().lower(): v.strip() for k, v in row.items() if k}
                attendees.append({
                    "name": normalized.get("name", normalized.get("full name", "Participant")),
                    "roll_no": normalized.get("roll no", normalized.get("roll_no", normalized.get("rollno", normalized.get("id", "N/A")))),
                    "email": normalized.get("email", normalized.get("email id", normalized.get("email_id", ""))),
                    "attendance": normalized.get("attendance", normalized.get("status", "Present")),
                })
    elif roster_file.suffix.lower() == ".json":
        with open(roster_file, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
            for item in raw_data:
                normalized = {k.strip().lower(): str(v).strip() for k, v in item.items() if k}
                attendees.append({
                    "name": normalized.get("name", "Participant"),
                    "roll_no": normalized.get("roll_no", normalized.get("roll no", "N/A")),
                    "email": normalized.get("email", ""),
                    "attendance": normalized.get("attendance", "Present"),
                })
    else:
        raise ValueError(f"Unsupported roster format: {roster_file.suffix}. Please provide .csv or .json")

    generated_list = []
    skipped_list = []

    for idx, att in enumerate(attendees, start=1):
        att_status = att["attendance"].strip().lower()
        is_eligible = (not filter_present) or (att_status in ["present", "yes", "attended", "1", "true"])

        if not is_eligible:
            skipped_list.append(att)
            continue

        safe_name = "".join(c for c in att["name"] if c.isalnum() or c in (" ", "_", "-")).rstrip().replace(" ", "_")
        cert_id = f"CERT-{uuid.uuid4().hex[:8].upper()}"
        out_filename = f"cert_{idx}_{safe_name}.svg"
        out_path = tmp_cert_dir / out_filename

        svg_content = create_svg_certificate(
            name=att["name"],
            roll_no=att["roll_no"],
            event_name=event_name,
            date_str=date_str,
            cert_id=cert_id
        )

        with open(out_path, "w", encoding="utf-8") as out_f:
            out_f.write(svg_content)

        generated_list.append({
            "name": att["name"],
            "roll_no": att["roll_no"],
            "email": att["email"],
            "cert_id": cert_id,
            "file_path": str(out_path),
            "file_name": out_filename
        })

    manifest_path = tmp_cert_dir / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as m_f:
        json.dump({
            "total_attendees": len(attendees),
            "eligible_generated": len(generated_list),
            "skipped_absent": len(skipped_list),
            "event_name": event_name,
            "date": date_str,
            "certificates": generated_list
        }, m_f, indent=2)

    return len(generated_list), len(skipped_list), manifest_path


def main():
    parser = argparse.ArgumentParser(description="Deterministic Event Certificate Generator")
    parser.add_argument("--roster", type=str, required=True, help="Path to attendee roster CSV or JSON")
    parser.add_argument("--event", type=str, default="Global Tech Symposium 2026", help="Event title")
    parser.add_argument("--date", type=str, default="September 17, 2026", help="Event date")
    parser.add_argument("--all", action="store_true", help="Generate for all records without filtering by attendance")

    args = parser.parse_args()

    try:
        gen_count, skip_count, manifest = generate_certificates(
            roster_path=args.roster,
            event_name=args.event,
            date_str=args.date,
            filter_present=not args.all
        )
        print(f"[SUCCESS] Generated {gen_count} certificates ({skip_count} absent attendees skipped).")
        print(f"[SUCCESS] Manifest saved to: {manifest}")
        sys.exit(0)
    except Exception as e:
        print(f"[ERROR] Generation failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
