#!/usr/bin/env python3
"""
Sample deterministic tool demonstrating Layer 3 Execution standards:
- Argument parsing with sensible defaults
- Clear error handling and exit codes
- Writes intermediate outputs strictly to .tmp/
- Reliable, testable, and self-contained
"""

import argparse
import json
import os
import sys
from pathlib import Path


def process_task(input_text: str, output_name: str) -> Path:
    """
    Simulates a deterministic processing operation.
    Outputs the result into the .tmp directory.
    """
    tmp_dir = Path(__file__).resolve().parent.parent / ".tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    
    target_path = tmp_dir / output_name
    
    data = {
        "status": "success",
        "input_length": len(input_text),
        "input_text": input_text,
        "uppercase": input_text.upper(),
        "word_count": len(input_text.split()),
    }
    
    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        
    return target_path


def main():
    parser = argparse.ArgumentParser(
        description="Sample execution tool: deterministic text processing."
    )
    parser.add_argument(
        "--input",
        type=str,
        default="Hello World",
        help="Input string to process."
    )
    parser.add_argument(
        "--output-file",
        type=str,
        default="sample_output.json",
        help="Name of output file in .tmp/"
    )

    args = parser.parse_args()

    try:
        output_file = process_task(args.input, args.output_file)
        print(f"[SUCCESS] Result written to {output_file}")
        sys.exit(0)
    except Exception as e:
        print(f"[ERROR] Execution failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
