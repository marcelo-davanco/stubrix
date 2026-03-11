---
description: Run end-to-end tests on the Stubrix dashboard using Playwright MCP
---

# E2E Testing with Playwright MCP

## Prerequisites
- API running: `npm run dev:api`
- UI dev server running: `npm run dev:ui`
- Browser available for Playwright MCP

## Test Flow: Project Management

1. Navigate to dashboard
   - Use `mcp4_browser_navigate` → `http://localhost:5173`

2. Take snapshot to see current state
   - Use `mcp4_browser_snapshot`

3. Create a new project
   - Click "New Project" button
   - Fill in project name and details
   - Submit form

4. Verify project appears in list
   - Use `mcp4_browser_snapshot` to check

## Test Flow: Mock Management

1. Select a project from the list
2. Navigate to Mocks page
3. Create a new mock:
   - Click "New Mock"
   - Fill method, URL, status, body
   - Save
4. Verify mock appears in the list
5. Edit the mock and verify changes persist
6. Delete the mock

## Test Flow: Recording

1. Navigate to Recording page
2. Enter proxy target URL
3. Click Start Recording
4. Verify recording status indicator
5. Click Stop Recording

## Test Flow: Database Management

1. Navigate to Databases page
2. Select engine (PostgreSQL)
3. View databases list
4. Create a snapshot
5. Verify snapshot appears in list
6. Restore snapshot
7. Delete snapshot

## Test Flow: Real-time Logs

1. Navigate to Logs page
2. Verify WebSocket connection (check for live updates)
3. Trigger API requests and verify logs appear

## Error Checking

After each test flow:
1. Check console for errors: `mcp4_browser_console_messages` with level `error`
2. Check network requests: `mcp4_browser_network_requests`
3. Take screenshots for visual verification: `mcp4_browser_take_screenshot`

## Common Issues
- **Page not loading**: Check if dev servers are running
- **API errors**: Check network tab for failed requests
- **WebSocket issues**: Check console for Socket.IO connection errors
