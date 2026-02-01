# Agentic CI/CD Patterns

## The Self-Healing Pipeline

### Concept

Traditional CI: Build fails → Human investigates → Human fixes → Re-run

Agentic CI: Build fails → Agent analyzes → Agent fixes → Auto-merge

### Elastic's Implementation

Elastic's Cloud team implemented self-healing PRs for dependency updates:

#### Architecture

```
┌──────────────┐
│   Renovate   │  Dependency update bot
│   Bot        │  Creates PRs automatically
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Buildkite  │  CI/CD platform
│   Pipeline   │  Runs builds & tests
└──────┬───────┘
       │
       ▼ (on failure)
┌──────────────┐
│   Claude     │  AI coding agent
│   Code       │  Analyzes & fixes
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Auto       │  If tests pass
│   Merge      │  Merge the PR
└──────────────┘
```

#### Key Components

1. **Build Log Analysis**
   - Fetch failed build logs from CI
   - Feed to AI agent for analysis
   - Agent identifies specific failures

2. **Targeted Fixes**
   - Agent runs failing subtasks
   - Iterates until green
   - Commits fixes with `Claude fix:` prefix

3. **Human Oversight**
   - Auto-merge disabled during agent work
   - All changes require human review
   - Labels track agent involvement

#### The Prompt Pattern

```
The build is failing. Analyze /tmp/previous_step_artifacts.

Commands: 
- ./gradlew publishForPlatform
- ./gradlew publishPlatformIndependent

You must:
- Find failing subtasks
- Apply fixes to make them succeed
- Follow CLAUDE.md recommendations
- Log actions to /tmp/claude-actions.log
- Commit successful fixes
- Add "SUCCESSFUL FIX" or "FAILED FIX" to log
```

### Parallel Agent Patterns

#### Git Worktrees

Each agent gets an isolated workspace:

```bash
# Create worktree for agent
git worktree add ../agent-001-workspace feature/agent-001-task

# Agent works in isolation
cd ../agent-001-workspace
# ... make changes ...

# Merge back
git checkout main
git merge feature/agent-001-task
```

#### Branch-Per-Agent

```
main
├── agent/task-001  (Agent 1 working)
├── agent/task-002  (Agent 2 working)  
├── agent/task-003  (Agent 3 working)
└── agent/task-004  (Completed, awaiting merge)
```

#### Orchestration Challenges

1. **Conflict Detection**
   - Monitor which files each agent touches
   - Alert on overlapping changes
   - Queue conflicting tasks sequentially

2. **Merge Strategy**
   - First-to-finish gets priority
   - Rebase subsequent agents
   - Or: dedicated merge coordinator

3. **Budget Management**
   - Track cost per agent
   - Kill runaway agents
   - Prioritize by ROI

### 2026 Trends (New Stack)

#### 1. MCP Management
As MCP servers proliferate, organizations need:
- Central MCP registries
- Permission management
- Cost tracking per server

#### 2. Parallel Execution Workflows
More tools supporting:
- Background task execution
- Workspace isolation
- Agent handoffs

#### 3. CLI vs Desktop Clarity
Providers clarifying:
- Which features in CLI vs Desktop
- How they interact
- Enterprise management

#### 4. Agent-Driven Commerce
Agents calling paid services:
- Model upgrade decisions
- API cost management
- Budget gates

## Implementing Agentic CI

### Prerequisites

1. **CI Platform** with programmatic step control
2. **AI Agent** (Claude Code, Codex CLI, etc.)
3. **Structured Logging** for agent actions
4. **CLAUDE.md/AGENTS.md** with codebase context

### Basic Flow

```yaml
# .github/workflows/agentic-ci.yml
name: Agentic CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build & Test
        id: build
        continue-on-error: true
        run: npm run build && npm run test
      
      - name: AI Fix (on failure)
        if: steps.build.outcome == 'failure'
        uses: anthropics/claude-code-action@v1
        with:
          prompt: |
            The build failed. Analyze the error and fix it.
            Log: ${{ steps.build.outputs.log }}
          allowed_tools: ["bash", "edit", "write"]
          
      - name: Retry Build
        if: steps.build.outcome == 'failure'
        run: npm run build && npm run test
```

### Advanced: Swarm CI

```yaml
# Multiple agents working in parallel
jobs:
  plan:
    outputs:
      tasks: ${{ steps.decompose.outputs.tasks }}
    steps:
      - name: Decompose Work
        id: decompose
        run: |
          # AI decomposes PR into parallelizable tasks
          
  execute:
    needs: plan
    strategy:
      matrix:
        task: ${{ fromJson(needs.plan.outputs.tasks) }}
    steps:
      - name: Create Worktree
        run: git worktree add ../agent-${{ matrix.task.id }}
        
      - name: Execute Task
        run: |
          cd ../agent-${{ matrix.task.id }}
          claude -p "${{ matrix.task.prompt }}"
          
  merge:
    needs: execute
    steps:
      - name: Merge All
        run: |
          # Orchestrated merge of all agent branches
```

## Open Questions

1. How to handle non-deterministic agent outputs?
2. What's the optimal agent-to-task ratio?
3. How to measure agent productivity vs cost?
4. When should agents escalate to humans?
