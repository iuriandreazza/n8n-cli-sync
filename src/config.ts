import * as fs from 'fs';
import * as path from 'path';
import type { N8NCliConfig, EnvironmentConfig } from './types';

const CONFIG_FILENAME = 'n8n-cli-config.json';

/**
 * Resolves the path to the config file.
 * Explicit `configPath` takes priority; otherwise looks for `n8n-cli-config.json`
 * in the current working directory.
 */
function resolveConfigPath(configPath?: string): string {
  if (configPath) {
    return path.resolve(configPath);
  }
  return path.join(process.cwd(), CONFIG_FILENAME);
}

export function loadConfig(configPath?: string): N8NCliConfig {
  const resolvedPath = resolveConfigPath(configPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Config file not found: ${resolvedPath}\n` +
        `Run "n8n-sync init" to create a starter config, then fill in your environment URLs and API keys.`,
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
  } catch {
    throw new Error(`Failed to parse config file: ${resolvedPath}. Ensure it contains valid JSON.`);
  }

  validateConfig(raw, resolvedPath);
  return raw as N8NCliConfig;
}

export function validateConfig(raw: unknown, filePath: string): asserts raw is N8NCliConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`Config file ${filePath} must be a JSON object.`);
  }

  const cfg = raw as Record<string, unknown>;

  if (typeof cfg['environments'] !== 'object' || cfg['environments'] === null) {
    throw new Error(`Config field "environments" must be an object in ${filePath}.`);
  }

  const envs = cfg['environments'] as Record<string, unknown>;
  for (const [name, env] of Object.entries(envs)) {
    if (typeof env !== 'object' || env === null) {
      throw new Error(`Environment "${name}" must be an object in ${filePath}.`);
    }
    const e = env as Record<string, unknown>;
    if (typeof e['url'] !== 'string' || !e['url']) {
      throw new Error(`Environment "${name}" is missing a valid "url" in ${filePath}.`);
    }
    if (typeof e['apiKey'] !== 'string' || !e['apiKey']) {
      throw new Error(`Environment "${name}" is missing a valid "apiKey" in ${filePath}.`);
    }
  }

  if (typeof cfg['source'] !== 'string' || !cfg['source']) {
    throw new Error(`Config field "source" must be a non-empty string in ${filePath}.`);
  }

  if (typeof cfg['target'] !== 'string' || !cfg['target']) {
    throw new Error(`Config field "target" must be a non-empty string in ${filePath}.`);
  }

  if (!envs[cfg['source'] as string]) {
    throw new Error(
      `Source environment "${cfg['source']}" is not defined under "environments" in ${filePath}.`,
    );
  }

  if (!envs[cfg['target'] as string]) {
    throw new Error(
      `Target environment "${cfg['target']}" is not defined under "environments" in ${filePath}.`,
    );
  }
}

export function getEnvironment(config: N8NCliConfig, name: string): EnvironmentConfig {
  const env = config.environments[name];
  if (!env) {
    const available = Object.keys(config.environments).join(', ');
    throw new Error(`Environment "${name}" not found in config. Available: ${available}`);
  }
  return env;
}

/**
 * Returns the resolved workflows directory.
 * Priority: config.workflowsDir → cwd/n8n-config/workflows
 */
export function resolveWorkflowsDir(config: N8NCliConfig): string {
  if (config.workflowsDir) {
    return path.resolve(config.workflowsDir);
  }
  return path.join(process.cwd(), 'n8n-config', 'workflows');
}
