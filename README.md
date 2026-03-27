# Rejeki

AI personal finance agent powered by Claude + MCP. Manage your money through natural conversation — envelope budgeting, transactions, scheduled payments, and more.

## Setup

**Requirements:** Python 3.11+, Claude Desktop

**1. Install**
```bash
pip install -e .
```

**2. Add to Claude Desktop config**

`%AppData%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "rejeki": {
      "command": "C:\\path\\to\\python.exe",
      "args": ["-m", "rejeki.server"],
      "cwd": "C:\\path\\to\\rejeki"
    }
  }
}
```

**3. Restart Claude Desktop** and verify `rejeki` appears under Connectors.
