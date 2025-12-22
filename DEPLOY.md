# Deployment

This project deploys to GitHub Pages from the `gh-pages` branch.

## One-command deploy

```bash
npm run deploy
```

## What the script does

1. Builds the Vite app into `dist/`.
2. Creates a temporary worktree at `.gh-pages`.
3. Replaces the contents of the `gh-pages` branch with the latest build.
4. Pushes to `origin/gh-pages`.

If you change the Pages source in GitHub settings, update this file accordingly.
