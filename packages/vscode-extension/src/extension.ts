import * as vscode from 'vscode';

const API_URL = () =>
  vscode.workspace.getConfiguration('stubrix').get<string>('apiUrl') ?? 'http://localhost:9090';

async function apiGet(path: string): Promise<unknown> {
  const res = await fetch(`${API_URL()}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost(path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${API_URL()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

class MocksTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void { this._onDidChangeTreeData.fire(undefined); }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem { return element; }

  async getChildren(): Promise<vscode.TreeItem[]> {
    try {
      const projects = (await apiGet('/api/projects')) as Array<Record<string, unknown>>;
      return projects.map((p) => {
        const item = new vscode.TreeItem(
          String(p['name'] ?? p['id']),
          vscode.TreeItemCollapsibleState.None,
        );
        item.tooltip = `Project: ${p['id']}`;
        item.contextValue = 'project';
        return item;
      });
    } catch {
      return [new vscode.TreeItem('API unavailable')];
    }
  }
}

class ScenariosTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void { this._onDidChangeTreeData.fire(undefined); }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem { return element; }

  async getChildren(): Promise<vscode.TreeItem[]> {
    try {
      const scenarios = (await apiGet('/api/scenarios')) as Array<Record<string, unknown>>;
      return scenarios.map((s) => {
        const meta = (s['meta'] ?? s) as Record<string, unknown>;
        const item = new vscode.TreeItem(
          String(meta['name'] ?? meta['id']),
          vscode.TreeItemCollapsibleState.None,
        );
        item.tooltip = String(meta['createdAt'] ?? '');
        item.contextValue = 'scenario';
        return item;
      });
    } catch {
      return [new vscode.TreeItem('API unavailable')];
    }
  }
}

let statusBarItem: vscode.StatusBarItem;

async function updateStatusBar(): Promise<void> {
  try {
    const data = (await apiGet('/api/status')) as Record<string, unknown>;
    const engine = String(data['engine'] ?? 'unknown');
    statusBarItem.text = `$(server) Stubrix: ${engine}`;
    statusBarItem.backgroundColor = undefined;
  } catch {
    statusBarItem.text = '$(warning) Stubrix: offline';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
  statusBarItem.show();
}

export function activate(context: vscode.ExtensionContext): void {
  const mocksProvider = new MocksTreeDataProvider();
  const scenariosProvider = new ScenariosTreeDataProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('stubrix.mocks', mocksProvider),
    vscode.window.registerTreeDataProvider('stubrix.scenarios', scenariosProvider),
  );

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  statusBarItem.command = 'stubrix.openDocs';
  context.subscriptions.push(statusBarItem);

  const showConfig = vscode.workspace.getConfiguration('stubrix').get<boolean>('showStatusBar', true);
  if (showConfig) {
    updateStatusBar();
    const interval = setInterval(updateStatusBar, 30_000);
    context.subscriptions.push({ dispose: () => clearInterval(interval) });
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('stubrix.refreshMocks', () => {
      mocksProvider.refresh();
      scenariosProvider.refresh();
      vscode.window.showInformationMessage('Stubrix: mocks refreshed.');
    }),

    vscode.commands.registerCommand('stubrix.startEngine', async () => {
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Starting Stubrix engine...' },
        async () => {
          try {
            await apiPost('/api/engine/start');
            vscode.window.showInformationMessage('Stubrix engine started.');
            updateStatusBar();
          } catch (err) {
            vscode.window.showErrorMessage(`Failed to start engine: ${(err as Error).message}`);
          }
        },
      );
    }),

    vscode.commands.registerCommand('stubrix.stopEngine', async () => {
      try {
        await apiPost('/api/engine/stop');
        vscode.window.showInformationMessage('Stubrix engine stopped.');
        updateStatusBar();
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to stop engine: ${(err as Error).message}`);
      }
    }),

    vscode.commands.registerCommand('stubrix.captureScenario', async () => {
      const name = await vscode.window.showInputBox({ prompt: 'Scenario name' });
      if (!name) return;
      try {
        await apiPost('/api/scenarios/capture', { name });
        vscode.window.showInformationMessage(`Scenario "${name}" captured.`);
        scenariosProvider.refresh();
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to capture scenario: ${(err as Error).message}`);
      }
    }),

    vscode.commands.registerCommand('stubrix.openDocs', () => {
      vscode.env.openExternal(vscode.Uri.parse(`${API_URL()}/api/docs`));
    }),

    vscode.commands.registerCommand('stubrix.doctor', async () => {
      const checks = [
        { name: 'API', path: '/api/status' },
        { name: 'RAG', path: '/api/intelligence/health' },
        { name: 'Pact', path: '/api/contracts/health' },
      ];
      const results: string[] = [];
      for (const c of checks) {
        try {
          await apiGet(c.path);
          results.push(`✅ ${c.name}`);
        } catch {
          results.push(`❌ ${c.name}`);
        }
      }
      vscode.window.showInformationMessage(`Stubrix Doctor:\n${results.join('\n')}`);
    }),
  );
}

export function deactivate(): void {
  statusBarItem?.dispose();
}
