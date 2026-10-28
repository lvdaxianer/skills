# Proposal

## Why

The v2 service-deployment Skill standardizes immutable host releases, but it does not yet define how Docker images, persistent host data, or operator-supplied incremental JAR/configuration overrides participate in the same release and rollback contract. Without this boundary, a container can lose business data on recreation, hide packaged libraries through an unsafe bind mount, or run an unrecorded mutable override.

## What Changes

- Add a Docker container runtime target while preserving `systemd`, `manual-foreground`, and `manual-background` lifecycle modes.
- Define build, registry, digest pinning, image labels, provenance, and production pull rules.
- Define the host-persistent directory classes: external configuration, business data, Docker volumes, overrides, logs, and release records; explicitly classify ephemeral runtime state.
- Add a controlled `overrides/` layer for incremental JARs and configuration without replacing the image's default `lib` or default configuration directories.
- Require an override manifest, SHA-256 validation, deterministic load order, permissions, compatibility evidence, release-record capture, and rollback of the previous override set.
- Define Docker container identity checks, Compose/systemd/manual lifecycle adapters, mount safety, container rebuild recovery, backup/restore ownership, and exact image cleanup rules.
- Extend the release record schema with runtime target, container identity, persistence mounts, and override evidence.
- Add a Docker deployment reference, persistence manifest schema, and safe Compose template.

## Capabilities

### New Capabilities

- `service-deployment-docker-runtime`: Docker image build, registry, container identity, lifecycle adapters, persistent mounts, incremental overrides, recovery and cleanup.

### Modified Capabilities

- `service-deployment-standard`: extend the deployment contract and release records to support a Docker runtime target while retaining host-process behavior.
- `service-deployment-v2-hardening`: apply archive/config/security, health, rollback, retention and stack rules to image digests, mounts and override manifests.

## Impact

- `service-deploy/SKILL.md` and its references/templates/schema.
- The registered local copy at `/Users/lvdaxianer/.codex/skills/service-deployment/` will be synchronized after source verification.
- No business project code, server state, credentials, or production deployment is changed.
- Docker Engine/Compose are optional runtime dependencies; Kubernetes is outside this capability and must use a separate standard.
