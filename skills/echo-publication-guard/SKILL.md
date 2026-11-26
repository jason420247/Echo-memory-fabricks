---
name: echo-publication-guard
description: Enforce one-way downstream publication-boundary safety, per-actuator Git branch isolation, disambiguated actor labels, and Pre-Existing Background-IP SHA-256 ledger generation.
---
# Echo Publication & Actuation Guard Skill

Use this skill before committing, opening pull requests, exporting downstream packages to a public repository, or generating a Pre-Existing Background-IP schedule.

## Mandatory Pre-Commit & Pre-Release Checks

1. **Actuation Branch Namespace**: Automated and agent-driven work must remain on `actuation/<surface>/<slug>` branches, never pushing directly to `main`.
2. **Actor Disambiguation**: Never record a bare `"copilot"` actor string; disambiguate explicitly between `COPILOT_GH`, `COPILOT_MS`, `JULES`, `ANTIGRAVITY_VM`, and `OPERATOR`.
3. **Publication-Boundary Sentinel**: Scan the repository tree to guarantee `0` local host drive paths, `0` private key/token literals, `0` `HOLD_PRIVATE` markers, and `0` unverified `"CLAIMED"` evidence grades.
4. **Background-IP Ledger Sync**: Refresh and verify `specs/background-ip-ledger.json` whenever tracked modules change so SHA-256 private-expense provenance hashes stay current.

## Verification & CLI Usage

```bash
node bin/emf.mjs audit-sentinel
node bin/emf.mjs ip-ledger
```

Anchor check: `emf audit-sentinel` and `emf ip-ledger` must report `verdict: RELEASE` and `clean: true`.
