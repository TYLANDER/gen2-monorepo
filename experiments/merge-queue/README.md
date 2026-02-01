# Merge Queue Experiment

Traffic control for parallel agent merges.

## The Problem

```
10 agents finishing simultaneously
         │
         ▼
┌─────────────────────────────┐
│  CONSTANT MERGE CONFLICTS   │
│  "Please rebase your PR"    │
│  "Branch is out of date"    │
└─────────────────────────────┘
```

## The Solution

```
Agent PR #1 ─────┐
Agent PR #2 ─────┤
Agent PR #3 ─────┼────► MERGE QUEUE ────► Test Together ────► Atomic Merge
Human PR #1 ─────┤
Agent PR #4 ─────┘
```

## How It Works

### 1. Queue Collection
PRs are collected into batches based on:
- Time window (every 5 minutes)
- Queue size threshold (5 PRs max per batch)
- Priority (human PRs can jump queue)

### 2. Conflict Detection
Before batching, check for file overlaps:
```typescript
const conflicts = detectFileConflicts(prs);
if (conflicts.length > 0) {
  // Sequential merge for conflicting PRs
  return queueSequentially(conflicts);
}
```

### 3. Speculative Merge
All PRs in batch are merged to a temporary branch:
```bash
git checkout -b merge-queue/batch-123
git merge pr-1 pr-2 pr-3 --no-ff
```

### 4. Combined Testing
Run full CI on the merged result:
- If pass: Push to main
- If fail: Bisect to find culprit, requeue others

## GitHub Configuration

```yaml
# .github/settings.yml
merge_queue:
  enabled: true
  max_batch_size: 5
  wait_time_minutes: 5
  required_checks:
    - build
    - test
    - triage
```

## Azure DevOps Configuration

```yaml
# azure-pipelines.yml
trigger:
  batch: true
  branches:
    include:
      - main

pr:
  autoCancel: true
  drafts: false
```

## Priority Levels

| Priority | Source | Behavior |
|----------|--------|----------|
| P0 | Hotfix | Immediate merge, bypass queue |
| P1 | Human | Jump to front of queue |
| P2 | Agent (reviewed) | Normal queue |
| P3 | Agent (auto) | Back of queue |

## Metrics

Track queue health:
- Average wait time
- Batch success rate
- Conflict frequency
- Human vs agent ratio

## Integration with Gen 2

```
┌─────────────────────────────────────────────────────────────┐
│                        GEN 2 PIPELINE                        │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐│
│  │ Sandbox  │───▶│ Triage   │───▶│  Merge   │───▶│  Main  ││
│  │ (local)  │    │ (gate)   │    │  Queue   │    │ Branch ││
│  └──────────┘    └──────────┘    └──────────┘    └────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Future: Intelligent Batching

Use ML to predict:
- Which PRs are likely to conflict
- Optimal batch size for current load
- Best time windows for merging
- Risk score for each PR
