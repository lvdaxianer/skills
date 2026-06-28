# Extend Architecture Deployment Planning

## Summary

Update the `architecture-design-spec` skill so architecture documents treat
deployment architecture as a first-class view. System-level architecture
documents must include deployment resource planning for both standalone and
high-availability deployments.

## Motivation

The current skill requires several architecture diagrams, including deployment
architecture, but it does not explicitly require the overall document to answer
which components run on which machines and what machine specifications are
needed. This leaves implementation and operations teams without a clear
deployment baseline.

## Scope

- Add business architecture as an explicitly recognized architecture view.
- Strengthen deployment architecture requirements for system-level documents.
- Require system-level overall documents to list standalone deployment machine
  specifications, component placement, and resource notes.
- Require system-level overall documents to list high-availability deployment
  machine specifications, component placement, instance counts, and resource
  notes.
- Update templates, default `.arch-spec.yaml` sample, checking logic, and report
  examples so generated and reviewed documents consistently cover deployment
  resource planning.

## Non-Goals

- Do not introduce a capacity-estimation formula or environment-specific sizing
  calculator.
- Do not require every module-level document to contain full standalone and
  high-availability resource tables.
- Do not change unrelated code-review, commit, or development workflow skills.

## Acceptance Criteria

- `architecture-design-spec/SKILL.md` mentions business architecture wherever
  architecture view types are enumerated.
- System-level deployment architecture checks require standalone and
  high-availability resource planning.
- The default configuration sample includes deployment resource planning rules.
- The standard and complete templates include deployment resource planning
  subsections for standalone and high-availability deployments.
- A focused verification command can confirm the new required phrases exist in
  the target skill file.
