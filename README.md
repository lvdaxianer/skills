# Claude Code Skills

A collection of reusable skills for [Claude Code](https://claude.ai/code) to boost development productivity and enforce best practices.

## Available Skills

| Skill | Description | Trigger |
|-------|-------------|---------|
| [code-review-spec](code-review-spec/) | Comprehensive code review assistant for all programming languages. Enforces strict canonical checks for comment standards (≥60%), naming conventions, security rules, exception handling, logging standards, DB specs, API design, batch processing, null safety, and more. | Automatically triggered on code changes, formatting, or review requests. |
| [commit](commit/) | Thin pointer to the canonical commit command standard for Conventional Commit messages, Chinese git commit messages, commit splitting, and commit option decisions. | Triggered when committing changes, generating commit messages, or running `/commit`. |
| [development-workflow](development-workflow/) | Mandatory development workflow that enforces Superpowers planning, TDD RED/GREEN cycles, strict code-review-spec checks, and Chinese Conventional Commit submission before moving to the next task. | Triggered when starting or executing development tasks that require strict process gates. |
| [ddd](ddd/) | Domain-Driven Design best practices — bounded contexts, entities, value objects, aggregates, domain events, repositories, domain services, CQRS, event sourcing. | Triggered by DDD-related discussions or complex domain modeling. |
| [package-backup](package-backup/) | Package and restore archive tasks that must follow the `package_backup.sh` contract for naming, validation, and restore safety. | Triggered when packaging, backing up, restoring, unzipping, or extracting files and directories. |
| [product-manager](product-manager/) | Product management best practices — requirement analysis, product planning, UX design, data-driven decisions, A/B testing, agile practices, MVP mindset. | Triggered on product discussions, user stories, feature design, or business metrics. |
| [story-line](story-line/) | Interactive story-line creation for business execution. Guides users through 6 core elements (goals, milestones, roles, flows, data flow, exceptions) with brainstorm-powered refinement. Optionally validates via Chrome DevTools MCP. | Triggered when user wants to create a business story line. |

## Installation

### Option 1: Clone to Claude Code Skills Directory (Recommended)

```bash
# Clone this repository
 git clone https://github.com/lvdaxianerplus/skills.git

# Copy skills to Claude Code's global skills directory
cp -r skills/code-review-spec ~/.claude/skills/
cp -r skills/commit ~/.claude/skills/
cp -r skills/development-workflow ~/.claude/skills/
cp -r skills/ddd ~/.claude/skills/
cp -r skills/package-backup ~/.claude/skills/package-backup
cp -r skills/product-manager ~/.claude/skills/
cp -r skills/story-line ~/.claude/skills/
```

### Option 2: Per-Project Installation

```bash
# Inside your project root
mkdir -p .claude/skills
cp -r /path/to/skills/code-review-spec .claude/skills/
cp -r /path/to/skills/commit .claude/skills/
cp -r /path/to/skills/development-workflow .claude/skills/
cp -r /path/to/skills/ddd .claude/skills/
cp -r /path/to/skills/package-backup .claude/skills/package-backup
cp -r /path/to/skills/product-manager .claude/skills/
cp -r /path/to/skills/story-line .claude/skills/
```

### Verify Installation

Restart Claude Code or reload the session. Skills will be automatically discovered and listed in the available skills.

### Default Agent Context

Copy [`AGENTS.md`](AGENTS.md) into a project root to make Codex load the
`development-workflow` rules at session start. Copy [`CLAUDE.md`](CLAUDE.md)
into a project root to make Claude Code load the same default workflow.

These context files do not replace the skill. They point each agent at
[`development-workflow/SKILL.md`](development-workflow/SKILL.md) for general
development and [`package-backup/SKILL.md`](package-backup/SKILL.md) for archive
work, so the plan-first, TDD-first, code-review-gated, Chinese Conventional
Commit workflow stays active before normal development work begins.

## Skill Details

### code-review-spec

- **Languages**: Java, Python, Go, TypeScript, Vue, and more
- **Checks**: Code specs, comments (≥60%), naming, security, exceptions, logging, DB, API design, Git commits, dependencies, complexity limits, null safety, function params, duplication, magic numbers, collection capacity, string concatenation, equals/hashCode
- **References**: Extensive reference docs in [`references/`](code-review-spec/references/)

### development-workflow

- **Plan**: Uses `superpowers:writing-plans` before development begins
- **TDD**: Requires RED/GREEN/REFACTOR verification for every task
- **Review**: Runs `code-review-spec` after each small task and strictly fixes all applicable issues
- **Commit**: Runs `commit` and creates one atomic Chinese Conventional Commit before continuing

### package-backup

- **Canonical Source**: Delegates to [`package-backup/SKILL.md`](package-backup/SKILL.md)
- **Scope**: Packaging, backup, restore, unzip, and extraction workflows
- **Rule**: Follow the `package_backup.sh` contract for naming, validation, and restore safety

### commit

- **Canonical Source**: Delegates to `/Users/lvdaxianer/.claude/commands/commit.md`
- **Scope**: Commit message generation, commit splitting decisions, commit options, and Chinese Conventional Commit usage
- **Rule**: Follow the stricter rule when repository-local instructions conflict with the canonical source

### ddd

- **Strategic Design**: Bounded contexts, ubiquitous language, context mapping
- **Tactical Design**: Value objects, entities, aggregates, domain events, domain services, repositories, factories
- **Architecture**: Four-layer architecture (Interfaces → Application → Domain → Infrastructure)
- **Patterns**: CQRS, event sourcing

### product-manager

- **Frameworks**: User story mapping, 5Why analysis, RICE prioritization
- **UX**: Nielsen heuristics, cognitive load theory
- **Data**: Funnel analysis, A/B testing, North Star metrics
- **Deliverables**: Solution comparison templates, product review checklists

### story-line

- **Dependencies**: Requires `brainstorm` skill (Superpowers extension) for refinement
- **Optional**: Chrome DevTools MCP for automated browser testing
- **Output**: Markdown story file, optional code skeleton, optional test report
- **Elements**: Goals, milestones, roles, flows, data flow, exception scenarios

## Requirements

- [Claude Code](https://claude.ai/code) CLI or IDE extension
- For `development-workflow` skill: Superpowers `writing-plans` and `test-driven-development`, plus the configured `code-review-spec` and `commit` skills
- For `commit` skill: `/Users/lvdaxianer/.claude/commands/commit.md` must be readable
- For `story-line` skill: `brainstorm` skill from Superpowers extension
- For `story-line` browser testing: Chrome DevTools MCP

## License

[MIT](LICENSE)
