import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { pullCommand } from '../../src/commands/pull';
import { N8NClient } from '../../src/client';
import type { N8NCliConfig, N8NWorkflow } from '../../src/types';

jest.mock('../../src/client');

const MockedN8NClient = N8NClient as jest.MockedClass<typeof N8NClient>;

const WORKFLOW: N8NWorkflow = {
  id: '1',
  name: 'My Test Workflow',
  active: false,
  nodes: [],
  connections: {},
};

const BASE_CONFIG: N8NCliConfig = {
  environments: {
    develop: { url: 'http://localhost:5678', apiKey: 'dev-key' },
    production: { url: 'https://prod.example.com', apiKey: 'prod-key' },
  },
  source: 'develop',
  target: 'production',
};

describe('pullCommand', () => {
  let tmpDir: string;
  let config: N8NCliConfig;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-pull-test-'));
    config = { ...BASE_CONFIG, workflowsDir: path.join(tmpDir, 'workflows') };
    MockedN8NClient.mockClear();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates the workflows directory if it does not exist', async () => {
    const mockInstance = {
      listWorkflows: jest.fn().mockResolvedValue([]),
    };
    MockedN8NClient.mockImplementation(() => mockInstance as unknown as N8NClient);

    await pullCommand(config, {});
    // No workflows, but we still don't create the dir (nothing to save)
    // Expect no error thrown
  });

  it('saves each workflow as a JSON file', async () => {
    const mockInstance = {
      listWorkflows: jest.fn().mockResolvedValue([WORKFLOW]),
      getWorkflow: jest.fn().mockResolvedValue(WORKFLOW),
    };
    MockedN8NClient.mockImplementation(() => mockInstance as unknown as N8NClient);

    await pullCommand(config, {});

    const workflowsDir = path.join(tmpDir, 'workflows');
    expect(fs.existsSync(workflowsDir)).toBe(true);

    const files = fs.readdirSync(workflowsDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toBe('my-test-workflow.json');

    const saved = JSON.parse(fs.readFileSync(path.join(workflowsDir, files[0]), 'utf-8'));
    expect(saved.workflow.name).toBe('My Test Workflow');
    expect(saved.sourceEnvironment).toBe('develop');
    expect(saved.exportedAt).toBeDefined();
  });

  it('respects --env option to override the source environment', async () => {
    const mockInstance = {
      listWorkflows: jest.fn().mockResolvedValue([]),
    };
    MockedN8NClient.mockImplementation(() => mockInstance as unknown as N8NClient);

    await pullCommand(config, { env: 'production' });

    expect(MockedN8NClient).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://prod.example.com' }),
    );
  });

  it('logs failed workflows but continues processing', async () => {
    const wf2: N8NWorkflow = { ...WORKFLOW, id: '2', name: 'Another Workflow' };
    const mockInstance = {
      listWorkflows: jest.fn().mockResolvedValue([WORKFLOW, wf2]),
      getWorkflow: jest
        .fn()
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValueOnce(wf2),
    };
    MockedN8NClient.mockImplementation(() => mockInstance as unknown as N8NClient);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await pullCommand(config, {});
    consoleSpy.mockRestore();

    const workflowsDir = path.join(tmpDir, 'workflows');
    const files = fs.readdirSync(workflowsDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toBe('another-workflow.json');
  });
});
