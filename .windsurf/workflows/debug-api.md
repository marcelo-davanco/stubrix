---
description: Debug NestJS API issues including runtime errors, database connections and WebSocket problems
---

# Debug API Workflow

## Quick Diagnostics

1. Check if API is running
// turbo
```bash
curl -s http://localhost:9090/api/status | jq .
```

2. Check API logs (if running via npm)
- Look at the terminal running `npm run dev:api`
- NestJS logs include module initialization, route registration, errors

3. Check Docker containers
// turbo
```bash
docker compose ps
```

## Common Issues

### Port already in use
```bash
lsof -i :9090
kill -9 {PID}
```

### Database connection failed
1. Check PostgreSQL is running: `make postgres-up`
2. Verify .env vars match docker-compose:
   - `PG_HOST=localhost`, `PG_PORT=5442`, `PG_USER=postgres`, `PG_PASSWORD=postgres`
3. Test connection via MCP: use `mcp6_query` with `SELECT 1`

### Module not found / Import errors
1. Rebuild shared: `npm run build:shared`
2. Check `tsconfig.json` paths configuration
3. Verify workspace symlinks: `ls -la node_modules/@stubrix/`

### WebSocket not connecting
1. Check Socket.IO namespace: `/ws/logs`
2. Verify CORS config in `.env`: `CORS_ORIGIN=*`
3. Test via browser console:
   ```javascript
   const socket = io('http://localhost:9090/ws/logs');
   socket.on('connect', () => console.log('connected'));
   ```

### Mock engine not responding
1. Check mock server container: `docker compose --profile wiremock ps`
2. Test WireMock admin: `curl http://localhost:8081/__admin/mappings`
3. Check MOCK_PORT in .env matches expectations

## Debug Mode

### Start API with debugger
```bash
npm run start:debug -w @stubrix/api
```
- Attach VS Code debugger to port 9229
- Set breakpoints in service/controller files

### Add temporary logging
```typescript
import { Logger } from '@nestjs/common';
const logger = new Logger('DebugContext');
logger.debug('Variable state:', JSON.stringify(variable));
```

## Database Inspection (via PostgreSQL MCP)
```sql
-- Check tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check snapshot metadata
SELECT * FROM pg_stat_activity WHERE datname = 'postgres';

-- Check connections
SELECT count(*) FROM pg_stat_activity;
```

## Useful MCP Tools
- **PostgreSQL MCP**: direct SQL queries to inspect DB state
- **Playwright MCP**: verify UI behavior and console errors
- **Memory MCP**: check past debugging sessions for known issues
