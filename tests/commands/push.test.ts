import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { pushCommand } from '../../src/commands/push';
import { N8NClient } from '../../src/client';
import type { N8NCliConfig, N8NWorkflow, WorkflowFile } from '../../src/types';

jest.mock('../../src/client');

const MockedN8NClient = N8NClient as jest.MockedClass<typeof N8NClient>;

const WORKFLOW: N8NWorkflow = {
  id: '1',
  name: 'My Test Workflow',
  active: true,
  nodes: [
    {
      id: 'node-1',
      name: 'Start',
      type: 'n8n-nodes-base.start',
      typeVersion: 1,
      position: [0, 0],
      parameters: {},
      credentials: { someCredential: { id: 'cred-env-1', name: 'My Cred' } },
    },
  ],
  connections: {},
};

const WORKFLOW_FILE: WorkflowFile = {
  exportedAt: '2024-01-01T00:00:00.000Z',
  sourceEnvironment: 'develop',
  workflow: WORKFLOW,
};

const BASE_CONFIG: N8NCliConfig = {
  environments: {
    develop: { url: 'http://localhost:5678', apiKey: 'dev-key' },
    production: { url: 'https://prod.example.com', apiKey: 'prod-key' },
  },
  source: 'develop',
  target: 'production',
};

function writeWorkflowFiles(dir: string, files: WorkflowFile[]): void {
  fs.mkdirSync(dir, { recursive: true });
  for (const file of files) {
    const slug = file.workflow.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    fs.writeFileSync(path.join(dir, `${slug}.json`), JSON.stringify(file), 'utf-8');
  }
}

describe('pushCommand', () => {
  let tmpDir: string;
  let config: N8NCliConfig;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-push-test-'));
    config = { ...BASE_CONFIG, workflowsDir: path.join(tmpDir, 'workflows') };
    MockedN8NClient.mockClear();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws when the workflows directory does not exist', async () => {
    const mockInstance = {
      listWorkflows: jest.fn().mockResolvedValue([]),
      createWorkflow: jest.fn(),
    };
    MockedN8NClient.mockImplementation(() => mockInstance as unknown as N8NClient);

    await expect(pushCommand(config, {})).rejects.toThrow('Workflows directory not found');
  });

  it('creates a new workflow when it does not exist on target', async () => {
    writeWorkflowFiles(path.join(tmpDir, 'workflows'), [WORKFLOW_FILE]);

    const mockInstance = {
      listWorkflows: jest.fn().mockResolvedValue([]),
      createWorkflow: jest.fn().mockResolvedValue({ ...WORKFLOW, id: '99' }),
    };
    MockedN8NClient.mockImplementation(() => mockInstance as unknown as N8NClient);

    await pushCommand(config, {});

    expect(mockInstance.createWorkflow).toHaveBeenCalledTimes(1);
    const payload = mockInstance.createWorkflow.mock.calls[0][0];
    expect(payload.name).toBe('My Test Workflow');
    // Default: pushed as inactive
    expect(payload.active).toBe(false);
    // Credentials stripped
    expect(payload.nodes[0].credentials).toEqual({});
  });

  it('updates an existing workflow matched by name', async () => {
    writeWorkflowFiles(path.join(tmpDir, 'workflows'), [WORKFLOW_FILE]);

    const existingOnTarget: N8NWorkflow = { ...WORKFLOW, id: '55' };
    const mockInstance = {
      listWorkflows: jest.fn().mockResolvedValue([existingOnTarget]),
      updateWorkflow: jest.fn().mockResolvedValue(existingOnTarget),
    };
    MockedN8NClient.mockImplementation(() => mockInstance as unknown as N8NClient);

    await pushCommand(config, {});

    expect(mockInstance.updateWorkflow).toHaveBeenCalledWith('55', expect.any(Object));
  });

  it('preserves active state when --activate flag is set', async () => {
    writeWorkflowFiles(path.join(tmpDir, 'workflows'), [WORKFLOW_FILE]);

    const mockInstance = {
      listWorkflows: jest.fn().mockResolvedValue([]),
      createWorkflow: jest.fn().mockResolvedValue({ ...WORKFLOW, id: '99' }),
    };
    MockedN8NClient.mockImplementation(() => mockInstance as unknown as N8NClient);

    await pushCommand(config, { activate: true });

    const payload = mockInstance.createWorkflow.mock.calls[0][0];
    // Workflow was active: true in source, so active should be preserved
    expect(payload.active).toBe(true);
  });

  it('respects --env option to override the target environment', async () => {
    writeWorkflowFiles(path.join(tmpDir, 'workflows'), [WORKFLOW_FILE]);

    const mockInstance = {
      listWorkflows: jest.fn().mockResolvedValue([]),
      createWorkflow: jest.fn().mockResolvedValue({ ...WORKFLOW }),
    };
    MockedN8NClient.mockImplementation(() => mockInstance as unknown as N8NClient);

    await pushCommand(config, { env: 'develop' });

    expect(MockedN8NClient).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'http://localhost:5678' }),
    );
  });

  it('continues processing when a single workflow fails', async () => {
    const wf2: N8NWorkflow = { ...WORKFLOW, id: '2', name: 'Second Workflow', active: false };
    writeWorkflowFiles(path.join(tmpDir, 'workflows'), [
      WORKFLOW_FILE,
      { ...WORKFLOW_FILE, workflow: wf2 },
    ]);

    let callCount = 0;
    const mockInstance = {
      listWorkflows: jest.fn().mockResolvedValue([]),
      createWorkflow: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.reject(new Error('API error'));
        return Promise.resolve({ ...wf2, id: '99' });
      }),
    };
    MockedN8NClient.mockImplementation(() => mockInstance as unknown as N8NClient);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await pushCommand(config, {});
    consoleSpy.mockRestore();

    expect(mockInstance.createWorkflow).toHaveBeenCalledTimes(2);
  });

  it('throws when workflows directory is empty', async () => {
    fs.mkdirSync(path.join(tmpDir, 'workflows'), { recursive: true });

    const mockInstance = {
      listWorkflows: jest.fn().mockResolvedValue([]),
    };
    MockedN8NClient.mockImplementation(() => mockInstance as unknown as N8NClient);

    await expect(pushCommand(config, {})).rejects.toThrow('No workflow JSON files found');
  });
});
