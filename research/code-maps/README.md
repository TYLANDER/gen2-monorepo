# Code Maps for AI Assistants

## The Problem

> "LLMs rely entirely on provided context. Raw code access isn't enough. It's analogous to navigating a city using only street view."

### Current Limitations

1. **Context Rot** - Performance degrades with longer inputs, even with million-token windows
2. **Lost in the Middle** - AI struggles with info buried in middle of long contexts
3. **No Semantic Understanding** - Lexical matching isn't enough

## The Solution: Code Maps

A **Code Map** is a structured representation of codebase architecture optimized for AI consumption.

### What a Code Map Contains

```yaml
# project-map.yaml
meta:
  name: "my-monorepo"
  updated: "2026-02-01"
  
architecture:
  style: "microservices"
  primary_language: "typescript"
  frameworks:
    - nextjs
    - express
    - prisma

ownership:
  teams:
    - name: "platform"
      owns: ["packages/core", "services/auth"]
    - name: "product"
      owns: ["apps/web", "apps/mobile"]

dependency_clusters:
  core:
    - "@repo/types"
    - "@repo/utils"
    - "@repo/config"
  services:
    - "@repo/api"
    - "@repo/worker"
    
ci_health:
  flaky_tests: ["packages/core/auth.test.ts"]
  slow_builds: ["apps/web"]
  failure_rate: 0.05
```

### Abstraction Levels

| Level | Name | Content | Use Case |
|-------|------|---------|----------|
| 30,000ft | Architecture | System overview, boundaries | "What does this project do?" |
| 10,000ft | Components | Package summaries, relationships | "What depends on auth?" |
| 1,000ft | Modules | File structure, exports | "Where is login handled?" |
| 0ft | Code | Actual source files | "How does login work?" |

### Progressive Disclosure

AI should navigate between levels as needed:

```
User: "Add rate limiting to the API"

AI @ 30,000ft: "This is a microservices monorepo with Express backend"
AI @ 10,000ft: "API service is in services/api, uses middleware pattern"
AI @ 1,000ft: "Middleware is in services/api/src/middleware/"
AI @ 0ft: *reads actual middleware files, implements rate limiting*
```

## Implementation Ideas

### 1. d.ts-Style Summaries

Just like TypeScript definitions, create "compressed" versions:

```typescript
// packages/auth/SUMMARY.md (AI-optimized)
/**
 * @package auth
 * @owner platform-team
 * @dependencies @repo/types, @repo/db
 * 
 * Authentication and authorization for the platform.
 * 
 * ## Key Exports
 * - `authenticate(token: string): User | null`
 * - `authorize(user: User, resource: string): boolean`
 * - `createSession(user: User): Session`
 * 
 * ## Patterns Used
 * - JWT tokens with refresh rotation
 * - Role-based access control (RBAC)
 * - Session stored in Redis
 * 
 * ## Common Issues
 * - Token expiry is 15min, refresh is 7d
 * - Must call `invalidateSession` on logout
 */
```

### 2. Graph-Based Navigation

```typescript
// Code map API for AI
interface CodeMap {
  // Get overview at any level
  getOverview(level: "architecture" | "component" | "module"): Summary;
  
  // Navigate relationships
  getDependencies(pkg: string): Package[];
  getDependents(pkg: string): Package[];
  
  // Find relevant context
  searchByCapability(query: string): Location[];
  getOwner(path: string): Team;
  
  // CI integration
  getRecentFailures(path: string): CIRun[];
  getTestCoverage(path: string): number;
}
```

### 3. MCP Integration

Expose code map via MCP for AI assistants:

```json
{
  "tools": [
    {
      "name": "get_architecture_overview",
      "description": "Get high-level architecture summary"
    },
    {
      "name": "get_package_summary", 
      "description": "Get compressed summary of a package"
    },
    {
      "name": "find_by_capability",
      "description": "Find code handling a specific capability"
    },
    {
      "name": "get_dependency_graph",
      "description": "Get dependency relationships"
    }
  ]
}
```

## Research Questions

1. What's the optimal compression ratio for summaries?
2. How to keep code maps in sync with code?
3. What metadata is most valuable for AI?
4. How to handle cross-repo maps?

## Related Work

- Nx Project Graph
- LSP (Language Server Protocol)
- Sourcegraph code intelligence
- LSIF (Language Server Index Format)
