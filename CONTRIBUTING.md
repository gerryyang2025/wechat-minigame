# Contributing

## Scope

This repository contains multiple WeChat game projects. Each top-level directory should represent one standalone project.

## General Rules

- Write all repository documentation in English.
- Keep project folders isolated from one another.
- Avoid committing generated local files, personal AppIDs, or machine-specific settings.
- Use placeholder values in example config files.
- Prefer non-destructive edits when a project already contains local work.

## Project Structure

Each project should include:

- a `README.md`
- a local validation workflow
- a `project.private.config.example.json` when private configuration is required
- a clear separation between runtime code, assets, and source logic

## Documentation Standards

- Keep setup instructions short and reproducible.
- Explain which files are safe to edit locally and which files should not be committed.
- Include release or import notes when WeChat DevTools configuration matters.
- Update documentation whenever behavior, structure, or tooling changes.

## Configuration and Secrets

- Never commit real credentials, tokens, private keys, or personal `project.private.config.json` files.
- Use clearly labeled placeholder values such as `your-wechat-minigame-appid`.
- Keep project-level `.gitignore` rules when a project has additional local-only files.

## Validation

- Run local validation scripts before finishing a change whenever they exist.
- If a project does not yet have validation, prefer adding a lightweight script over relying on manual checks only.

## Pull Request Expectations

- Keep changes scoped to the relevant project unless a repository-level improvement is intentional.
- Mention any manual verification that still needs to happen in WeChat DevTools or on a real device.
- Call out known risks, missing assets, or remaining release steps.
