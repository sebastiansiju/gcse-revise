# Local ruleset for `main`

GitHub rulesets need GitHub Pro for private repos, so `main` is protected locally with git hooks:

| Hook | Rule |
|---|---|
| `pre-commit` | No commits directly on `main`: make a branch first. |
| `pre-push` | No pushing to `main` and no deleting `main`: push a branch and open a pull request. |

Changes reach `main` only by merging a pull request on GitHub.

**Turn the hooks on** (needed once per clone):

```bash
git config core.hooksPath .githooks
```

**Emergency bypass** (use rarely): add `--no-verify` to `git commit` or `git push`.

These hooks only run on computers where they're turned on; GitHub itself doesn't enforce them.
