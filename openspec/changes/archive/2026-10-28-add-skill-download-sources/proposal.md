# Proposal: document exact Skill download sources

## Why

The installation README names dependencies but does not tell an AI which repository or package source contains each dependency. That makes a first-time installation ambiguous and can lead to guessed URLs or incomplete installs.

## What changes

- Add authoritative source URLs for the first-party Gitee repository and the Superpowers repository.
- Map each dependency family to its repository path or external suite.
- Add clone, source discovery, and source verification rules to the installation README.

## Non-goals

- Do not change runtime behavior or the fixed product architecture.
- Do not add unverified third-party download sources.
