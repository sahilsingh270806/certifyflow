# 3-Layer Agent Architecture Workspace

This repository implements a **3-layer architecture** for AI agents and human collaborators, maximizing reliability by separating probabilistic reasoning from deterministic execution.

---

## Workspace Structure

```text
madam jii/
├── directives/          # Layer 1: SOPs in Markdown (What to do)
│   └── _template.md     # Standard SOP template for new directives
├── execution/           # Layer 3: Deterministic Python tools (Doing the work)
│   ├── __init__.py
│   └── sample_tool.py   # Example deterministic CLI execution tool
├── .tmp/                # Intermediates / scratch files (auto-generated, gitignored)
├── .env.example         # Environment variables template
├── .gitignore           # Ignores .tmp, secrets, credentials, and venvs
├── AGENTS.md            # Agent system instructions (mirrored)
├── CLAUDE.md            # Anthropic / Claude mirror
├── GEMINI.md            # Google / Gemini mirror
├── adent.md             # Original agent instructions specification
└── README.md            # Workspace documentation
```

---

## The 3 Layers

1. **Layer 1: Directive (What to do)**
   - Located in [`directives/`](file:///d:/madam%20jii/directives/).
   - Defines goals, required inputs, tool execution steps, and edge cases.
   - Use [`directives/_template.md`](file:///d:/madam%20jii/directives/_template.md) when writing new SOPs.

2. **Layer 2: Orchestration (Decision-making)**
   - The AI Agent (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`).
   - Reads directives, decides the sequence of tool invocations, handles errors, and self-anneals.

3. **Layer 3: Execution (Doing the work)**
   - Located in [`execution/`](file:///d:/madam%20jii/execution/).
   - Fast, deterministic, testable Python scripts.
   - Writes intermediates to `.tmp/` and uploads deliverables to cloud destinations.

---

## Operating Principles & Self-Annealing

- **Check for tools first**: Search `execution/` before creating new scripts.
- **Intermediates vs Deliverables**: All local processing files stay in `.tmp/`. Deliverables belong in cloud services (Sheets, Slides, APIs).
- **Self-Annealing Loop**: When a script encounters an error or API edge case:
  1. Fix the script in `execution/`.
  2. Test deterministic execution.
  3. Update the corresponding directive in `directives/` with newly discovered constraints or rate limits.
