# AGENTS.md - Developer & AI Agent Guide for Video-creation 🤖

## 🎯 Repository Overview
**Video-creation**: This contains everything you need to run your app locally. View your app in AI Studio: https://ai.studio/apps/drive/16dPjFiYALwSE1UMS-fhuD56rydW2aVtM

---

## 🏗️ Repository Architecture
Key directories and entrypoints: `App.tsx, LICENSE, README.md, components/, constants.ts, index.html, index.tsx, metadata.json, package.json, services/, tsconfig.json, types.ts`.

### Tech Stack & Runtime
- **Environment:** Node.js 20+, TypeScript / React / Vite
- **Bundler:** Vite (ESM build pipeline)

## ⚙️ Executable Verification Commands

### 1. Type Checking
```bash
npx tsc --noEmit
```

### 2. Production Bundle Build
```bash
npm run build
```

### 3. Test Suite
```bash
npm test --if-present
```

---

## 🛡️ Coding & Safety Guidelines for Autonomous Agents

1. **Documentation Integrity:** Preserve all existing docstrings, header comments, and licensing banners. Never delete context unless specifically instructed.
2. **Zero Hardcoded Secrets:** Never embed API keys, OAuth tokens, personal access tokens, or sensitive credentials in committed files. Read credentials exclusively from environment variables or secure credential paths.
3. **Git Hygiene:**
   - Do not force-push (`git push --force`) or execute destructive resets.
   - Never modify root git configurations or harness infrastructure outside task scope.
   - Keep git diffs atomic, focused, and verified before committing.
4. **Agent Workflow Protocol:**
   - **Plan:** Inspect codebase architecture and dependencies before editing.
   - **Act:** Make minimal, clean, high-precision changes.
   - **Verify:** Run the appropriate verification commands listed above.
   - **Reflect:** Confirm zero regressions and review `git diff`.

---
*Maintained by Ayyappa Pravin • Built for Antigravity, Claude, Cursor & Autonomous AI Agents.*
