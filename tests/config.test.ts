import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadConfig, validateConfig, getEnvironment, resolveWorkflowsDir } from '../src/config';
import type { N8NCliConfig } from '../src/types';

const VALID_CONFIG: N8NCliConfig = {
  environments: {
    develop: { url: 'http://localhost:5678', apiKey: 'dev-key' },
    production: { url: 'https://prod.example.com', apiKey: 'prod-key' },
  },
  source: 'develop',
  target: 'production',
};

describe('loadConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-sync-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads a valid config from an explicit path', () => {
    const configPath = path.join(tmpDir, 'n8n-cli-config.json');
    fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG), 'utf-8');

    const result = loadConfig(configPath);
    expect(result.source).toBe('develop');
    expect(result.target).toBe('production');
    expect(result.environments.develop.url).toBe('http://localhost:5678');
  });

  it('throws when config file is missing', () => {
    const configPath = path.join(tmpDir, 'nonexistent.json');
    expect(() => loadConfig(configPath)).toThrow('Config file not found');
  });

  it('throws when config file contains invalid JSON', () => {
    const configPath = path.join(tmpDir, 'n8n-cli-config.json');
    fs.writeFileSync(configPath, '{ invalid json }', 'utf-8');
    expect(() => loadConfig(configPath)).toThrow('Failed to parse config file');
  });
});

describe('validateConfig', () => {
  it('passes for a valid config object', () => {
    expect(() => validateConfig(VALID_CONFIG, 'test.json')).not.toThrow();
  });

  it('throws when root is not an object', () => {
    expect(() => validateConfig(null, 'test.json')).toThrow('must be a JSON object');
    expect(() => validateConfig('string', 'test.json')).toThrow('must be a JSON object');
  });

  it('throws when environments is missing', () => {
    expect(() => validateConfig({ source: 'a', target: 'b' }, 'test.json')).toThrow(
      '"environments" must be an object',
    );
  });

  it('throws when an environment entry is missing url', () => {
    const cfg = {
      environments: { dev: { apiKey: 'key' } },
      source: 'dev',
      target: 'dev',
    };
    expect(() => validateConfig(cfg, 'test.json')).toThrow('missing a valid "url"');
  });

  it('throws when an environment entry is missing apiKey', () => {
    const cfg = {
      environments: { dev: { url: 'http://localhost' } },
      source: 'dev',
      target: 'dev',
    };
    expect(() => validateConfig(cfg, 'test.json')).toThrow('missing a valid "apiKey"');
  });

  it('throws when source is missing', () => {
    const cfg = {
      environments: { dev: { url: 'http://localhost', apiKey: 'key' } },
      target: 'dev',
    };
    expect(() => validateConfig(cfg, 'test.json')).toThrow('"source" must be a non-empty string');
  });

  it('throws when target is missing', () => {
    const cfg = {
      environments: { dev: { url: 'http://localhost', apiKey: 'key' } },
      source: 'dev',
    };
    expect(() => validateConfig(cfg, 'test.json')).toThrow('"target" must be a non-empty string');
  });

  it('throws when source env is not defined in environments', () => {
    const cfg = {
      environments: { dev: { url: 'http://localhost', apiKey: 'key' } },
      source: 'nonexistent',
      target: 'dev',
    };
    expect(() => validateConfig(cfg, 'test.json')).toThrow(
      'Source environment "nonexistent" is not defined',
    );
  });

  it('throws when target env is not defined in environments', () => {
    const cfg = {
      environments: { dev: { url: 'http://localhost', apiKey: 'key' } },
      source: 'dev',
      target: 'nonexistent',
    };
    expect(() => validateConfig(cfg, 'test.json')).toThrow(
      'Target environment "nonexistent" is not defined',
    );
  });
});

describe('getEnvironment', () => {
  it('returns the environment config by name', () => {
    const env = getEnvironment(VALID_CONFIG, 'develop');
    expect(env.url).toBe('http://localhost:5678');
    expect(env.apiKey).toBe('dev-key');
  });

  it('throws with available env names when not found', () => {
    expect(() => getEnvironment(VALID_CONFIG, 'staging')).toThrow(
      'Environment "staging" not found',
    );
    expect(() => getEnvironment(VALID_CONFIG, 'staging')).toThrow(
      'develop, production',
    );
  });
});

describe('resolveWorkflowsDir', () => {
  it('uses config.workflowsDir when provided', () => {
    const cfg = { ...VALID_CONFIG, workflowsDir: '/custom/workflows' };
    expect(resolveWorkflowsDir(cfg)).toBe('/custom/workflows');
  });

  it('defaults to cwd/n8n-config/workflows when workflowsDir is not set', () => {
    const result = resolveWorkflowsDir(VALID_CONFIG);
    expect(result).toBe(path.join(process.cwd(), 'n8n-config', 'workflows'));
  });
});
