# Agent Sandbox
# Ephemeral environment for AI agents to test changes before real CI
#
# Key features:
# - Mirrors production environment
# - Isolated from real infrastructure
# - Cost-controlled execution
# - Automatic cleanup

FROM node:22-bookworm-slim

LABEL org.opencontainers.image.title="Gen2 Agent Sandbox"
LABEL org.opencontainers.image.description="Isolated environment for AI agent code testing"

# Install essential tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    jq \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install common development tools
RUN npm install -g \
    typescript \
    tsx \
    prettier \
    eslint \
    vitest \
    && npm cache clean --force

# Create non-root user for agent execution
RUN useradd -m -s /bin/bash agent && \
    mkdir -p /workspace /output && \
    chown -R agent:agent /workspace /output

# Set resource limits via environment
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV AGENT_TIMEOUT_SECONDS=300
ENV AGENT_MAX_RETRIES=3

# Working directory
WORKDIR /workspace

# Copy entrypoint script
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# Switch to non-root user
USER agent

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('OK')" || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npm", "test"]
