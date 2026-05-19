# PitchPulse — GitHub Copilot instructions

Read root `AGENTS.md` for project overview, stack, and run instructions.

## Git commits

**Required.** This repo uses Husky + commitlint. Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) or `git commit` will fail.

```
<type>(<optional scope>): <short description>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Rules:**

- Lowercase type; imperative mood (`add` not `added`); no trailing period on the subject
- `feat` = new capability; `fix` = bug fix; `docs` = documentation; `chore` = tooling/deps/config
- Optional scope for area: `frontend`, `backend`, `api`, etc.

**Examples:**

```
feat: add fotmob test match page
fix(tests): retry fotmob card load on cold start
docs: add copilot commit message guidelines
chore: configure husky and commitlint
```

When Copilot generates or suggests a commit message, **always** use this format.
