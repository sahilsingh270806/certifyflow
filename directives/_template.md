# Directive: [Task / Workflow Name]

## 1. Goal & Objective
Describe the outcome this SOP achieves. State what a successful run looks like in plain language.

## 2. Inputs & Prerequisites
- **Parameters / Inputs:** [Required arguments, search queries, URLs, IDs, etc.]
- **Prerequisites:** [Credentials, `.env` keys, active sessions, or dependencies required]
- **Deliverables Destination:** [Cloud target: Google Sheets ID, Slide Deck URL, or designated final output]

## 3. Tool & Execution Chain
Before writing or running any custom code, verify if scripts already exist in `execution/`:
1. `execution/[script_name_1].py` - Purpose and inputs.
2. `execution/[script_name_2].py` - Purpose and inputs.

## 4. Expected Outputs
- **Intermediates:** `.tmp/[intermediate_filename].json` (temporary processing only; safe to delete/regenerate)
- **Deliverables:** Final cloud deliverable or formatted asset presented to the user.

## 5. Edge Cases & Error Handling
- **Rate Limits & Throttling:** What to do when hitting rate limits (e.g. exponential backoff, batch endpoints).
- **Missing Data / Malformed Responses:** Fallback behavior.
- **Fail-Safe:** If an error occurs that consumes external paid tokens/credits, pause and check with user first.

## 6. Self-Annealing Log (Living Learnings)
*Record discoveries, API quirks, rate limit limits, and improvements below:*
- `YYYY-MM-DD`: [Initial SOP created]
