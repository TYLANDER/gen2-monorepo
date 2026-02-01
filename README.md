# Gen 2 Monorepo Architecture

> Research & experimentation for infinite code and agentic swarm CI

## Vision

**Gen 2 Monorepo** is the next evolution of monorepo architecture designed for:
- 🤖 **Parallel AI Agent Development** - 50+ agents working simultaneously
- ♾️ **Infinite Codebase Scaling** - No practical limits on codebase size
- 🔄 **Self-Healing CI/CD** - Agentic pipelines that fix themselves
- 🗺️ **Semantic Code Maps** - AI assistants that truly understand architecture

## The Problem with Gen 1

Traditional monorepos (even with modern tools) have limitations:

1. **AI Gets Lost** - LLMs suffer from "lost in the middle" problem with large contexts
2. **No Semantic Understanding** - Just having code in one place isn't enough
3. **Sequential CI** - Builds still largely sequential, not parallel-agent-aware
4. **Manual Fixes** - Broken builds require human intervention

## Gen 2 Principles

### 1. Code Maps, Not Just Code
> "It's like navigating a city with only street view. You need an aerial map."

Gen 2 provides structured metadata for AI consumption:
- Dependency graphs as first-class citizens
- Ownership and team boundaries
- Architectural decision records (ADRs)
- Component relationships

### 2. Agent-Native CI/CD
Instead of agents working around CI, CI works *with* agents:
- Parallel isolated workspaces (git worktrees)
- Self-correcting pipelines
- Agent-to-agent handoffs
- Budget-aware execution

### 3. Infinite Scaling Through Abstraction
- Compressed "type definition" style summaries for AI
- Progressive disclosure of detail
- Smart context windowing
- Federated multi-repo support

## Research Areas

| Area | Status | Directory |
|------|--------|-----------|
| Monorepo Tools Comparison | 🔬 Active | [/research/tools](./research/tools) |
| Agentic CI Patterns | 🔬 Active | [/research/agentic-ci](./research/agentic-ci) |
| Code Map Formats | 📋 Planned | [/research/code-maps](./research/code-maps) |
| Parallel Agent Isolation | 📋 Planned | [/research/isolation](./research/isolation) |

## Key Insights (So Far)

### Tool Landscape

| Tool | AI Integration | MCP Server | Best For |
|------|---------------|------------|----------|
| **Nx** | ⭐ Comprehensive | Official | Full-featured AI workflows |
| **moon** | ⭐ Comprehensive | Official | VCS integration, sync |
| **Rush** | ⭐ Comprehensive | Official | Enterprise scale |
| **Bazel** | 🔸 Basic | Community | Multi-language builds |
| **Turborepo** | ❌ None | None | Simple JS/TS projects |

### Self-Healing CI Pattern (from Elastic)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Build     │───▶│  If Fail    │───▶│  AI Agent   │
│   Fails     │    │  Trigger    │    │  Analyzes   │
└─────────────┘    └─────────────┘    └─────────────┘
                                            │
                                            ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Merge     │◀───│   Build     │◀───│  Agent      │
│   PR        │    │   Passes    │    │  Commits    │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Parallel Agent Execution

For agents to work on the same codebase simultaneously:
1. **Git Worktrees** - Isolated directories per agent
2. **Branch-per-task** - Each agent gets its own branch
3. **Merge orchestration** - Central coordinator handles conflicts
4. **Budget tracking** - Cost awareness per agent

## Getting Started

```bash
# Clone this repo
git clone https://github.com/TYLANDER/gen2-monorepo.git
cd gen2-monorepo

# Explore research
ls research/

# Try experiments
ls experiments/
```

## References

- [Monorepos & AI - monorepo.tools](https://monorepo.tools/ai)
- [Nx and AI: Why They Work Together](https://nx.dev/blog/nx-and-ai-why-they-work-together)
- [Self-Correcting CI with Claude - Elastic](https://www.elastic.co/search-labs/blog/ci-pipelines-claude-ai-agent)
- [5 Key Trends in Agentic Development 2026](https://thenewstack.io/5-key-trends-shaping-agentic-development-in-2026/)
- [2026 Agentic Coding Trends Report - Anthropic](https://resources.anthropic.com/hubfs/2026%20Agentic%20Coding%20Trends%20Report.pdf)

## Contributing

This is a research repository. Feel free to:
- Open issues with ideas
- Add research findings
- Propose experiments
- Share your own Gen 2 patterns

## License

MIT
