#!/usr/bin/env bash
set -e

echo "=== Initializing PersonaPlex Dev Environment ==="

# Install global tools
# BEFORE:
# sudo npm install -g opencode-ai @vercel/agent-browser

# AFTER:
sudo npm install -g opencode-ai agent-browser
agent-browser install

# Install Playwright system dependencies and Chromium binary
npx playwright install-deps chromium
npx playwright install chromium

# Verify executable setups
echo "=== Validating Tooling Installations ==="
which opencode-ai || echo "Warning: opencode-ai CLI not in PATH"
which agent-browser || echo "Warning: agent-browser CLI not in PATH"

echo "=== Setup Completed Successfully ==="