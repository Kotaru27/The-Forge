---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

> The-Forge adaptation (2026-11-05): use the vendored reference snapshot, rather than fetching instructions dynamically at review time. This avoids unexpected upstream rule changes and unreviewed external instructions.

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read `reference/web-interface-guidelines.md`, a pinned, repository-local copy of the upstream guideline rules
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the fetched guidelines
4. Output findings in the terse `file:line` format

## Guidelines Source

Pinned source, for attribution and optional explicitly approved updates (do **not** fetch unreviewed remote instructions while reviewing):

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Read `reference/web-interface-guidelines.md` for the reviewed rules and output format. It is pinned to `vercel-labs/web-interface-guidelines` commit `434b7f91364665f2f733b310ec54809bf8f37937`.

## Usage

When a user provides a file or pattern argument:
1. Read the vendored `reference/web-interface-guidelines.md`
2. Read the specified files
3. Apply all rules from the fetched guidelines
4. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.
