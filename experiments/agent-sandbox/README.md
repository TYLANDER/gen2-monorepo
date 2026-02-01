# Agent Sandbox

Ephemeral Docker environment for AI agents to test changes before touching real CI.

## Purpose

Agents must "prove themselves" in the sandbox before they can:
1. Push to a real branch
2. Trigger real CI pipelines  
3. Consume real compute budget

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    SANDBOX                           │
│                                                      │
│  ┌─────────────┐    ┌─────────────┐                │
│  │   Agent     │───▶│   Build     │                │
│  │   Code      │    │   & Test    │                │
│  └─────────────┘    └──────┬──────┘                │
│                            │                        │
│                     ┌──────▼──────┐                │
│                     │   Result    │                │
│                     │ PASS | FAIL │                │
│                     └─────────────┘                │
│                                                      │
└──────────────────────────┬──────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │   PASS:     │          │   FAIL:     │
       │ Push to CI  │          │ Agent fixes │
       └─────────────┘          └─────────────┘
```

## Usage

### Build the sandbox image

```bash
docker build -t gen2-sandbox .
```

### Run tests in sandbox

```bash
# Mount your code and run tests
docker run --rm \
  -v $(pwd)/../../:/workspace:ro \
  -v /tmp/sandbox-output:/output \
  gen2-sandbox \
  npm test
```

### Check result

```bash
cat /tmp/sandbox-output/result
# SANDBOX_PASS or SANDBOX_FAIL
```

## Features

### Resource Limits
- Memory: 2GB (configurable via NODE_OPTIONS)
- Timeout: 300s (configurable via AGENT_TIMEOUT_SECONDS)
- Retries: 3 (configurable via AGENT_MAX_RETRIES)

### Isolation
- Non-root user execution
- Read-only workspace mount
- Separate output directory
- No network access (optional)

### Logging
- All output captured to /output
- Per-attempt logs
- Final result file

## Integration with Swarm

```typescript
// swarm-orchestrator pseudocode
async function runAgentTask(agent: Agent, task: Task) {
  // Step 1: Agent generates code
  const code = await agent.generateCode(task);
  
  // Step 2: Test in sandbox FIRST
  const sandboxResult = await runInSandbox(code);
  
  if (sandboxResult === 'SANDBOX_FAIL') {
    // Agent must fix before proceeding
    return agent.retry(task, sandboxResult.logs);
  }
  
  // Step 3: Only now push to real CI
  await pushToCI(code);
}
```

## Configuration

Environment variables:
- `AGENT_TIMEOUT_SECONDS` - Max execution time (default: 300)
- `AGENT_MAX_RETRIES` - Retry attempts on failure (default: 3)
- `NODE_OPTIONS` - Node.js memory limits

## Cost Control

The sandbox prevents expensive CI runs by:
1. Catching obvious failures locally
2. Limiting execution time
3. Running in minimal container (not full CI environment)
4. No external service access (mocked)

Estimated savings: 60-80% reduction in failed CI runs.
