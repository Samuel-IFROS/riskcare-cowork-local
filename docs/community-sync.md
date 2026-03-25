## Community Sync

Use this flow to review upstream community updates without breaking the local Riskcare app.

### 1. Check what changed upstream

```bash
npm run community:check
```

This fetches `upstream/main` and shows which project files changed in community.

### 2. Verify the local app before merging anything

```bash
npm run verify:stability
```

This runs:

- `type-check`
- `lint -- --quiet`
- `vite build --mode=test`

If this fails, fix local issues first before taking new upstream changes.

### 3. Review upstream changes in a safe branch

```bash
git checkout riskcare-local
git fetch upstream
git checkout -b merge/upstream-YYYYMMDD
git merge upstream/main
```

If the merge is too large, bring changes by area instead of merging everything at once:

- `src/pages`
- `src/components/Trigger`
- `src/pages/Project`
- `src/hooks`
- `electron/main`

### 4. Re-run stability checks after each integration batch

```bash
npm run verify:stability
```

### 5. Only keep changes that pass app startup

After checks pass, start the app and confirm:

- login works
- `#/` renders
- settings render
- triggers/workspace open without a blank screen
