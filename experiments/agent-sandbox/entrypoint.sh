#!/bin/bash
# Agent Sandbox Entrypoint
# Executes agent commands with timeout and resource control

set -euo pipefail

# Configuration
TIMEOUT=${AGENT_TIMEOUT_SECONDS:-300}
MAX_RETRIES=${AGENT_MAX_RETRIES:-3}
OUTPUT_DIR="/output"

# Logging
log() {
    echo "[$(date -Iseconds)] $*" | tee -a "$OUTPUT_DIR/sandbox.log"
}

log "Agent Sandbox starting..."
log "Timeout: ${TIMEOUT}s, Max retries: ${MAX_RETRIES}"

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    log "Installing dependencies..."
    npm ci --prefer-offline 2>&1 | tee -a "$OUTPUT_DIR/install.log"
fi

# Execute command with timeout and retry logic
attempt=0
exit_code=1

while [ $attempt -lt $MAX_RETRIES ] && [ $exit_code -ne 0 ]; do
    attempt=$((attempt + 1))
    log "Attempt $attempt of $MAX_RETRIES: $*"
    
    # Run command with timeout
    set +e
    timeout "$TIMEOUT" "$@" 2>&1 | tee "$OUTPUT_DIR/attempt-$attempt.log"
    exit_code=$?
    set -e
    
    if [ $exit_code -eq 0 ]; then
        log "SUCCESS on attempt $attempt"
    elif [ $exit_code -eq 124 ]; then
        log "TIMEOUT on attempt $attempt"
    else
        log "FAILED on attempt $attempt (exit code: $exit_code)"
    fi
done

# Write final result
if [ $exit_code -eq 0 ]; then
    echo "SANDBOX_PASS" > "$OUTPUT_DIR/result"
else
    echo "SANDBOX_FAIL" > "$OUTPUT_DIR/result"
fi

log "Agent Sandbox finished with exit code: $exit_code"
exit $exit_code
