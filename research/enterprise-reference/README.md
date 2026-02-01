# Enterprise Reference Architecture

> Based on real-world Gen 2 infrastructure planning for high-volume AI development

## The "Infinite Code" Problem

### Gen 1 (Current State)
- Developer opens PR → CI runs all tests → Human reviews → Merge
- Throughput: 10-20 PRs/day
- **Constraint**: 50 AI agents = pipeline queues for hours

### The Risk
Without hermetic isolation:
- Agent changes CSS utility for App A
- Triggers rebuild of entire integration layer
- Wastes compute, delays releases
- Flaky tests cause agents to hallucinate fixes → noise loop

## The Three Pillars

### Pillar A: Hermeticity (The Build Graph)

Instead of `npm run build`, treat repo as a **mathematical graph**.

```
┌─────────────────────────────────────────────────────────┐
│                    MONOREPO                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Mobile   │  │   Web    │  │   KDS    │              │
│  │   App    │  │   App    │  │  System  │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │             │                     │
│       └──────┬──────┘             │                     │
│              │                    │                     │
│       ┌──────▼──────┐      ┌─────▼─────┐               │
│       │ Pizza       │      │  Kitchen  │               │
│       │ Builder UI  │      │  Display  │               │
│       └─────────────┘      └───────────┘               │
└─────────────────────────────────────────────────────────┘
```

**Result**: Agent modifies Pizza Builder UI → rebuilds ONLY Mobile + Web, NOT KDS.

### Pillar B: Remote Build Farm (Shared Brain)

```
Agent A builds @repo/utils ────► Cached in Cloud
                                      │
Agent B needs @repo/utils ◄───────────┘ (instant pull)
Human C needs @repo/utils ◄───────────┘ (instant pull)
```

**Rule**: "Never build the same thing twice"

Critical for swarm efficiency - prevents agents wasting tokens re-compiling.

### Pillar C: Merge Queues (Traffic Control)

**Problem**: 10 agents merging simultaneously = constant conflicts

**Solution**: 
```
Agent PR #1 ─────┐
Agent PR #2 ─────┤
Agent PR #3 ─────┼────► Merge Queue ────► Test Together ────► Merge to Main
Human PR #1 ─────┤
Agent PR #4 ─────┘
```

## Swarm Integration

### The Self-Healing CI Loop

```
┌─────────────┐
│ Agent Push  │
└──────┬──────┘
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  CI Runs    │────▶│  If Fail    │────▶│ JSON Logs   │
│ (w/ cache)  │     │             │     │ to Swarm    │
└─────────────┘     └─────────────┘     └──────┬──────┘
       │                                       │
       ▼ (pass)                                ▼
┌─────────────┐                         ┌─────────────┐
│ Human Sees  │                         │ Agent Fixes │
│ GREEN PR    │                         │ & Re-pushes │
└─────────────┘                         └─────────────┘
```

**Key Insight**: Humans only see green PRs. Agents iterate until success.

### The Sandbox Environment

Agents work in ephemeral Docker containers before touching real CI:

```dockerfile
# Agent must pass sandbox tests locally
# BEFORE allowed to push PR to real pipeline
```

Benefits:
- Prevents cost overruns
- Catches obvious failures early
- Mimics production environment

### The Triage Agent (Gatekeeper)

Before ANY AI code reaches human review:

```
┌─────────────────────────────────────────────────────┐
│                   TRIAGE AGENT                       │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐│
│  │   Semantic   │  │   Security   │  │   Style    ││
│  │   Review     │  │    Scan      │  │  Enforce   ││
│  │              │  │              │  │            ││
│  │ - Code smells│  │ - Secrets    │  │ - Lint     ││
│  │ - Hallucinated│ │ - PII        │  │ - Format   ││
│  │   deps       │  │ - Vuln deps  │  │ - Patterns ││
│  └──────────────┘  └──────────────┘  └────────────┘│
└─────────────────────────────────────────────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ HUMAN SEES  │
                   │ CLEAN PR    │
                   └─────────────┘
```

## Implementation Phases

### Phase 1: Foundation (Weeks 1-4)
- [ ] Audit dependency graph
- [ ] Implement Remote Caching (Nx Cloud or equivalent)
- [ ] Immediate developer velocity wins

### Phase 2: Agent Pilot (Weeks 5-8)
- [ ] Deploy Triage Agent in shadow mode on human PRs
- [ ] Containerize Sandbox environment
- [ ] Validate agent isolation

### Phase 3: Gen 2 Rollout (Months 3-4)
- [ ] Enable Merge Queues
- [ ] Activate first "Maintenance Swarm"
- [ ] Automated dependency updates
- [ ] Non-critical bug fixes

## Key Metrics

| Metric | Gen 1 | Gen 2 Target |
|--------|-------|--------------|
| PRs/day | 10-20 | 100+ |
| Build time | Minutes | Seconds |
| Human review queue | Always full | Only complex PRs |
| Merge conflicts | Constant | Rare |
| Flaky test noise | High | Near zero |
