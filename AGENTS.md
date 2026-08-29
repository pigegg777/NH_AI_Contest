## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming ??invoke /office-hours
- Strategy/scope ??invoke /plan-ceo-review
- Architecture ??invoke /plan-eng-review
- Design system/plan review ??invoke /design-consultation or /plan-design-review
- Full review pipeline ??invoke /autoplan
- Bugs/errors ??invoke /investigate
- QA/testing site behavior ??invoke /qa or /qa-only
- Code review/diff check ??invoke /review
- Visual polish ??invoke /design-review
- Ship/deploy/PR ??invoke /ship or /land-and-deploy
- Save progress ??invoke /context-save
- Resume context ??invoke /context-restore
- Author a backlog-ready spec/issue ??invoke /spec

## Agent skills

### Issue tracker

Issues are tracked in this repo's GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain-doc layout centered on root-level planning documents. See `docs/agents/domain.md`.
