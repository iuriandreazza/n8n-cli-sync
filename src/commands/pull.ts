import * as fs from 'fs';
import * as path from 'path';
import type { N8NCliConfig } from '../types';
import { N8NClient } from '../client';
import { getEnvironment, resolveWorkflowsBaseDir } from '../config';
import { extractErrorMessage } from '../error-utils';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureWorkflowsDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function pullCommand(
  config: N8NCliConfig,
  options: { env?: string },
): Promise<void> {
  const envName = options.env ?? config.source;
  const envConfig = getEnvironment(config, envName);
  const workflowsDir = path.join(resolveWorkflowsBaseDir(config), envName);

  console.log(`\n→ Pulling workflows from environment: ${envName} (${envConfig.url})\n`);

  const client = new N8NClient(envConfig);

  const summaries = await client.listWorkflows();
  if (summaries.length === 0) {
    console.log('No workflows found.');
    return;
  }

  console.log(`Found ${summaries.length} workflow(s). Fetching full details...\n`);

  ensureWorkflowsDir(workflowsDir);

  let saved = 0;
  let failed = 0;

  for (const summary of summaries) {
    const id = summary.id!;
    const name = summary.name;

    try {
      const workflow = await client.getWorkflow(id);
      const slug = slugify(name);
      const filename = `${slug}.json`;
      const filePath = path.join(workflowsDir, filename);

      fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2), 'utf-8');
      console.log(`  ✓ ${name} → ${filename}`);
      saved++;
    } catch (err) {
      const message = extractErrorMessage(err);
      console.error(`  ✗ ${name} (id: ${id}) — ${message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${saved} saved, ${failed} failed.`);
  console.log(`Location: ${workflowsDir}\n`);
}
