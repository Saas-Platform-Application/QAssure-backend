# QAssure CLI

Official Command Line Interface for the QAssure Platform.

## Installation

### From npm (when published)
```bash
npm install -g @qassure/cli
```

### From source
```bash
cd cli
npm install
npm link
```

## Quick Start
```bash
# Configure CLI
qassure config init

# Login
qassure auth login

# Check health
qassure health check

# List modules
qassure modules list

# Register a module
qassure modules register -i
```

## Commands

### Configuration
```bash
qassure config init          # Interactive setup
qassure config show          # Show current config
qassure config set <key> <value>  # Set a value
qassure config get <key>     # Get a value
qassure config reset         # Reset to defaults
```

### Authentication
```bash
qassure auth login           # Login (interactive)
qassure auth login -e user@example.com -p password
qassure auth logout          # Logout
qassure auth logout --all    # Logout all sessions
qassure auth whoami          # Show current user
qassure auth status          # Check auth status
qassure auth refresh         # Refresh token
```

### Modules
```bash
qassure modules list                    # List all modules
qassure modules list -s running         # Filter by status
qassure modules get <id>                # Get module details
qassure modules register -i             # Register (interactive)
qassure modules register -f module.json # Register from file
qassure modules start <id>              # Start module
qassure modules stop <id>               # Stop module
qassure modules restart <id>            # Restart module
qassure modules health <id>             # Check health
qassure modules stats                   # Show statistics
qassure modules states                  # Show state transitions
qassure modules delete <id>             # Delete module
```

### Users
```bash
qassure users list                  # List all users
qassure users list -s active        # Filter by status
qassure users get <id>              # Get user details
qassure users create -i             # Create (interactive)
qassure users activate <id>         # Activate user
qassure users deactivate <id>       # Deactivate user
qassure users assign-role <userId> <roleId>
qassure users remove-role <userId> <roleId>
qassure users delete <id>           # Delete user
```

### Documents
```bash
qassure docs list                   # List all documents
qassure docs list -s approved       # Filter by status
qassure docs list -t SOP            # Filter by type
qassure docs get <id>               # Get document details
qassure docs create -i              # Create (interactive)
qassure docs submit <id>            # Submit for review
qassure docs approve <id>           # Approve document
qassure docs reject <id> -r "reason"  # Reject document
qassure docs versions <id>          # List versions
qassure docs delete <id>            # Delete document
```

### CAPAs
```bash
qassure capas list                  # List all CAPAs
qassure capas list -p high          # Filter by priority
qassure capas list -t corrective    # Filter by type
qassure capas get <id>              # Get CAPA details
qassure capas create -i             # Create (interactive)
qassure capas add-action <id>       # Add action
qassure capas complete-action <capaId> <actionId>
qassure capas add-root-cause <id>   # Add root cause
qassure capas close <id>            # Close CAPA
qassure capas verify <id>           # Verify effectiveness
qassure capas delete <id>           # Delete CAPA
```

### Health
```bash
qassure health check        # Basic health check
qassure health detailed     # Detailed health (all services)
qassure health ready        # Readiness check
qassure health live         # Liveness check
qassure health ping         # Ping test
qassure health ping -c 5    # Ping 5 times
qassure health watch        # Continuous monitoring
qassure health watch -i 10  # Monitor every 10 seconds
```

## Global Options
```bash
-v, --version    Show version
-q, --quiet      Suppress non-essential output
--json           Output results as JSON
--no-color       Disable colored output
-h, --help       Show help
```

## Configuration File

Configuration is stored in:
- Linux: `~/.config/qassure-cli/config.json`
- macOS: `~/Library/Preferences/qassure-cli/config.json`
- Windows: `%APPDATA%\qassure-cli\config.json`

## Environment Variables

You can override configuration with environment variables:
```bash
QASSURE_API_URL=https://api.qassure.ai
QASSURE_TENANT_ID=your-tenant-id
QASSURE_ACCESS_TOKEN=your-token
```

## Examples

### Register and Start AiCH Module
```bash
# Create module config file
cat > aich-module.json << 'JSON'
{
  "module_id": "aich",
  "name": "AiCH - AI Compliance Helper",
  "version": "1.0.0",
  "runtime_language": "nodejs",
  "base_url": "http://aich-service:3001",
  "health_endpoint": "/health",
  "endpoints": [
    {"path": "/api/v1/aich/analyze", "method": "POST", "description": "Analyze document"},
    {"path": "/api/v1/aich/suggest", "method": "POST", "description": "Get suggestions"}
  ],
  "kafka_topics": {
    "publish": ["qassure.aich.events"],
    "subscribe": ["qassure.document.events", "qassure.capa.events"]
  },
  "cpu_request": "250m",
  "cpu_limit": "1000m",
  "memory_request": "256Mi",
  "memory_limit": "1Gi"
}
JSON

# Register
qassure modules register -f aich-module.json

# Start
qassure modules start <module-id>

# Verify health
qassure modules health <module-id>
```

### Create a CAPA from Audit Finding
```bash
# Interactive mode
qassure capas create -i

# Or with JSON file
cat > capa.json << 'JSON'
{
  "title": "Audit Finding - Documentation Gap",
  "capa_type": "corrective",
  "priority": "high",
  "source": "audit",
  "description": "Missing signatures on batch records",
  "due_date": "2026-02-01"
}
JSON

qassure capas create -f capa.json
```

### Monitor Platform Health
```bash
# One-time detailed check
qassure health detailed

# Continuous monitoring (every 5 seconds)
qassure health watch

# Monitor with custom interval
qassure health watch -i 30
```

## License

MIT
