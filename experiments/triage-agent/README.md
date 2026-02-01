# Triage Agent Experiment

The Triage Agent is the **gatekeeper** that validates AI-generated code before human review.

## Purpose

Ensure AI contributions meet quality standards:
1. **Semantic Review** - No code smells or hallucinated dependencies
2. **Security Scan** - No secrets, PII, or vulnerable dependencies
3. **Style Enforcement** - Consistent formatting and patterns

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      TRIAGE AGENT                            │
│                                                              │
│  ┌─────────────┐                                            │
│  │   Input     │  PR diff, commit messages, file list       │
│  └──────┬──────┘                                            │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   ANALYZERS                          │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐         │    │
│  │  │ Semantic  │ │ Security  │ │  Style    │         │    │
│  │  │ Analyzer  │ │ Scanner   │ │ Checker   │         │    │
│  │  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘         │    │
│  └────────┼─────────────┼─────────────┼────────────────┘    │
│           │             │             │                      │
│           └─────────────┼─────────────┘                      │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   VERDICT                            │    │
│  │  { pass: boolean, issues: Issue[], score: number }   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Usage

```bash
# Run triage on a PR
npx ts-node src/index.ts --pr 123

# Run on local diff
npx ts-node src/index.ts --diff HEAD~1

# Shadow mode (analyze but don't block)
npx ts-node src/index.ts --pr 123 --shadow
```

## Configuration

```yaml
# triage.config.yaml
semantic:
  maxComplexity: 20
  forbiddenPatterns:
    - "any"  # TypeScript any
    - "TODO.*HACK"
  
security:
  scanSecrets: true
  checkDependencies: true
  forbiddenPackages:
    - "event-stream"  # Known malicious
    
style:
  enforceFormat: true
  lintRules: "strict"
```

## Output

```json
{
  "verdict": "PASS",
  "score": 87,
  "issues": [
    {
      "type": "style",
      "severity": "warning",
      "file": "src/utils.ts",
      "line": 42,
      "message": "Prefer const over let"
    }
  ],
  "recommendations": [
    "Consider adding unit tests for new function"
  ]
}
```

## Integration Points

### GitHub Actions
```yaml
- name: Triage Agent
  uses: ./experiments/triage-agent
  with:
    pr_number: ${{ github.event.pull_request.number }}
    fail_on: error  # or warning
```

### Claude Code Hook
```json
{
  "hooks": {
    "PreCommit": [{
      "command": "npx ts-node experiments/triage-agent/src/index.ts --diff HEAD"
    }]
  }
}
```
