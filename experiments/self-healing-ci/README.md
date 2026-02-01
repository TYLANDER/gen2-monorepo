# Self-Healing CI Experiment

Based on Elastic's production implementation - CI that fixes itself.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     SELF-HEALING CI PIPELINE                      │
│                                                                   │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐       │
│  │  Push   │───▶│  Build  │───▶│  Test   │───▶│ Deploy  │       │
│  └─────────┘    └────┬────┘    └────┬────┘    └─────────┘       │
│                      │              │                            │
│                      ▼              ▼                            │
│                ┌─────────────────────────┐                       │
│                │     IF FAILURE          │                       │
│                │  Extract structured log │                       │
│                └───────────┬─────────────┘                       │
│                            │                                     │
│                            ▼                                     │
│                ┌─────────────────────────┐                       │
│                │     CLAUDE CODE         │                       │
│                │  - Analyze error        │                       │
│                │  - Generate fix         │                       │
│                │  - Test fix locally     │                       │
│                │  - Push fix commit      │                       │
│                └───────────┬─────────────┘                       │
│                            │                                     │
│                            ▼                                     │
│                      [RETRY PIPELINE]                            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Structured Error Logging

CI must output machine-readable errors:

```json
{
  "type": "build_failure",
  "task": "packages/core:build",
  "file": "src/utils.ts",
  "line": 42,
  "message": "Property 'foo' does not exist on type 'Bar'",
  "suggestion": "Did you mean 'foobar'?"
}
```

### 2. Agent Invocation Script

```bash
#!/bin/bash
# claude-fix-build.sh

# 1. Grab failed build logs
LOGS=$(buildkite-agent artifact download "build.log" .)

# 2. Set up Claude Code
export ANTHROPIC_API_KEY=$CLAUDE_API_KEY
export GITHUB_TOKEN=$GH_TOKEN

# 3. Stop auto-updates (Renovate, Dependabot)
gh pr edit $PR_NUMBER --add-label "stop-updating"

# 4. Invoke Claude with targeted prompt
claude code --prompt "
The build is failing. Analyze the log at /tmp/build.log.
Find which tasks failed and fix them.
Follow CLAUDE.md recommendations.
Commit fixes with 'Claude fix:' prefix.
Log actions to /tmp/claude-actions.log.
" --allowed-tools bash,edit,write
```

### 3. The Prompt

```markdown
The build is failing. You may find logs at /tmp/previous_step_artifacts.

Commands:
- `npm run build`
- `npm run test`

You must:
- Find which subtasks are failing
- Apply necessary fixes
- Follow CLAUDE.md recommendations
- Iterate on failing subtasks before global builds
- Log each action with timestamp

On success: Add "SUCCESSFUL FIX" to log
On failure: Add "FAILED FIX" to log

Commit successful fixes with "Claude fix:" prefix.
```

### 4. Human Oversight Gates

Even with self-healing, humans stay in control:

```yaml
# Safeguards
- Auto-merge disabled while agent works
- Label tracks agent involvement
- Max 3 fix attempts before human escalation
- Certain paths require human approval:
  - security/*
  - .github/workflows/*
  - package.json (dependencies)
```

## GitHub Actions Implementation

```yaml
name: Self-Healing CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    outputs:
      failed: ${{ steps.test.outcome == 'failure' }}
      logs: ${{ steps.test.outputs.logs }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Build & Test
        id: test
        continue-on-error: true
        run: |
          npm ci
          npm run build 2>&1 | tee build.log
          npm test 2>&1 | tee test.log
          
      - name: Upload logs
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: ci-logs
          path: "*.log"

  auto-fix:
    needs: build-and-test
    if: needs.build-and-test.outputs.failed == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.CLAUDE_PUSH_TOKEN }}
          
      - name: Download logs
        uses: actions/download-artifact@v4
        with:
          name: ci-logs
          
      - name: Claude Fix
        uses: anthropics/claude-code-action@v1
        with:
          api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            Build failed. Logs in current directory.
            Find errors, fix them, commit with "Claude fix:" prefix.
          allowed_tools: bash,edit,write
          max_iterations: 5
          
      - name: Push fix
        run: |
          git push origin HEAD
```

## Metrics to Track

| Metric | Target | Why |
|--------|--------|-----|
| Auto-fix success rate | > 70% | Measures agent effectiveness |
| Time to green | < 10 min | Measures iteration speed |
| Human escalations | < 30% | Measures autonomy |
| False fixes | < 5% | Measures correctness |

## Gotchas

1. **Flaky Tests** - Agent may "fix" by deleting test. Use test coverage gates.
2. **Loop Prevention** - Max iterations to prevent infinite fix loops.
3. **Security** - Never give agent access to secrets or production.
4. **Cost Control** - Cap API spend per PR.

## Integration with Other Experiments

```
Sandbox → Triage → Self-Healing CI → Merge Queue → Main
  │         │            │              │
  │         │            │              └── Conflict resolution
  │         │            └── Auto-fix failures
  │         └── Quality gate
  └── Local validation
```
