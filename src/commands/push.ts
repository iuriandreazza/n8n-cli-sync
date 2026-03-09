import * as fs from 'fs';
import * as path from 'path';
import type { N8NCliConfig, N8NWorkflow } from '../types';
import { N8NClient } from '../client';
import { getEnvironment, resolveWorkflowsDir } from '../config';
import { extractErrorMessage } from '../error-utils';

function readWorkflowFiles(workflowsDir: string): N8NWorkflow[] {
  if (!fs.existsSync(workflowsDir)) {
    throw new Error(
      `Workflows directory not found: ${workflowsDir}\nRun "n8n-sync pull" first to export workflows.`,
    );
  }

  const files = fs
    .readdirSync(workflowsDir)
    .filter((f) => f.endsWith('.json') && f !== '.gitkeep');

  if (files.length === 0) {
    throw new Error(
      `No workflow JSON files found in ${workflowsDir}.\nRun "n8n-sync pull" first to export workflows.`,
    );
  }

  return files.map((filename) => {
    const filePath = path.join(workflowsDir, filename);
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as N8NWorkflow;
    } catch {
      throw new Error(`Failed to parse workflow file: ${filePath}`);
    }
  });
}

function buildWorkflowPayload(
  workflow: N8NWorkflow,
  activate: boolean,
): Omit<N8NWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'versionId' | 'meta' | 'tags'> {
  // Whitelist only the fields accepted by the n8n create/update API.
  // Spreading the full pulled object causes 400 "must NOT have additional properties"
  // because fields like `meta`, `tags` (full objects), etc. are not part of the write schema.
  return {
    name: workflow.name,
    active: activate ? workflow.active : false,
    connections: workflow.connections,
    settings: workflow.settings,
    staticData: workflow.staticData,
    pinData: workflow.pinData,
    // Whitelist node fields — 'issues' is a read-only runtime field the API rejects.
    // Strip credential IDs — they are environment-specific; users must re-link in the target env.
    nodes: workflow.nodes.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      typeVersion: node.typeVersion,
      position: node.position,
      parameters: node.parameters,
      ...(node.credentials !== undefined && { credentials: {} }),
      ...(node.webhookId !== undefined && { webhookId: node.webhookId }),
      ...(node.disabled !== undefined && { disabled: node.disabled }),
      ...(node.notes !== undefined && { notes: node.notes }),
      ...(node.notesInFlow !== undefined && { notesInFlow: node.notesInFlow }),
      ...(node.color !== undefined && { color: node.color }),
      ...(node.executeOnce !== undefined && { executeOnce: node.executeOnce }),
      ...(node.alwaysOutputData !== undefined && { alwaysOutputData: node.alwaysOutputData }),
      ...(node.continueOnFail !== undefined && { continueOnFail: node.continueOnFail }),
      ...(node.onError !== undefined && { onError: node.onError }),
    })),
  };
}

export async function pushCommand(
  config: N8NCliConfig,
  options: { env?: string; activate?: boolean },
): Promise<void> {
  const envName = options.env ?? config.target;
  const envConfig = getEnvironment(config, envName);
  const activate = options.activate ?? false;
  const workflowsDir = resolveWorkflowsDir(config);

  console.log(`\n→ Pushing workflows to environment: ${envName} (${envConfig.url})`);
  if (!activate) {
    console.log(
      '  Note: Workflows will be created/updated as INACTIVE (pass --activate to preserve active state)\n',
    );
  } else {
    console.log('  Note: Preserving active/inactive state from source files\n');
  }

  const client = new N8NClient(envConfig);
  const workflowFiles = readWorkflowFiles(workflowsDir);

  console.log(`  Loading existing workflows from target...\n`);
  const existing = await client.listWorkflows();
  const existingByName = new Map<string, N8NWorkflow>(existing.map((w) => [w.name, w]));

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const workflow of workflowFiles) {
    const payload = buildWorkflowPayload(workflow, activate);

    try {
      const match = existingByName.get(workflow.name);

      if (match && match.id !== undefined) {
        await client.updateWorkflow(match.id, payload);
        console.log(`  ↻ ${workflow.name} (updated)`);
        updated++;
      } else {
        await client.createWorkflow(payload);
        console.log(`  + ${workflow.name} (created)`);
        created++;
      }
    } catch (err) {
      const message = extractErrorMessage(err);
      console.error(`  ✗ ${workflow.name} — ${message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${created} created, ${updated} updated, ${failed} failed.\n`);
}
