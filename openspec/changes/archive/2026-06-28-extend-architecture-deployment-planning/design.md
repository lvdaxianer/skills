# Design

## Approach

Use a documentation-only update to the existing `architecture-design-spec`
instructions. The change should be direct and explicit because this skill is an
operator guide, not a CLI implementation.

## Skill Behavior Changes

1. Architecture view enumeration adds `业务架构图` alongside existing function,
   logical, data, deployment, and process views.
2. Deployment architecture requirements explain that system-level documents must
   include:
   - standalone deployment machine specifications;
   - standalone component placement;
   - high-availability deployment machine specifications;
   - high-availability component placement and instance counts;
   - resource assumptions or constraints when sizing is an estimate.
3. Templates add deployment resource planning subsections so new documents have
   an obvious place to write the information.
4. The default `.arch-spec.yaml` example adds `deploymentResourcePlanning` and
   quality rules that check resource planning in system-level documents.
5. Report examples and pseudocode include a deployment resource planning check.

## Verification

Use a focused text-based test against
`/Users/lvdaxianer/.agents/skills/architecture-design-spec/SKILL.md`.

The test verifies that the skill includes the required terminology:

- `业务架构图`
- `单机部署`
- `高可用部署`
- `机器规格`
- `组件部署`
- `部署资源规划`

This is sufficient because the artifact is Markdown instructions and the change
is behavioral wording, not executable code.
