#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { loadConfig, getEnvironment } from './config';
import { N8NClient } from './client';
import { pullCommand } from './commands/pull';
import { pushCommand } from './commands/push';

const program = new Command();

program
  .name('n8n-sync')
  .description(
    'Sync n8n workflows between environments — pull, push, list, and bootstrap with ease.',
  )
  .version('1.0.0')
  .option('-c, --config <path>', 'Path to n8n-cli-config.json (default: ./n8n-cli-config.json)');

// ─── pull ────────────────────────────────────────────────────────────────────

program
  .command('pull')
  .description(
    'Pull all workflows from an n8n environment and save them as JSON files under n8n-config/workflows/',
  )
  .option('-e, --env <name>', 'Environment name (overrides "source" in config)')
  .action(async (options: { env?: string }) => {
    try {
      const config = loadConfig(program.opts().config as string | undefined);
      await pullCommand(config, options);
    } catch (err) {
      console.error('\nError:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ─── push ────────────────────────────────────────────────────────────────────

program
  .command('push')
  .description(
    'Push stored workflow JSON files to an n8n environment. ' +
      'Matches by workflow name — creates new or updates existing.',
  )
  .option('-e, --env <name>', 'Environment name (overrides "target" in config)')
  .option(
    '--activate',
    'Preserve the active/inactive state from the source file (default: push as inactive)',
  )
  .action(async (options: { env?: string; activate?: boolean }) => {
    try {
      const config = loadConfig(program.opts().config as string | undefined);
      await pushCommand(config, options);
    } catch (err) {
      console.error('\nError:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ─── list ────────────────────────────────────────────────────────────────────

program
  .command('list')
  .description('List all workflows available in an n8n environment')
  .option('-e, --env <name>', 'Environment name (defaults to "source" in config)')
  .action(async (options: { env?: string }) => {
    try {
      const config = loadConfig(program.opts().config as string | undefined);
      const envName = options.env ?? config.source;
      const envConfig = getEnvironment(config, envName);

      console.log(`\n→ Listing workflows from: ${envName} (${envConfig.url})\n`);

      const client = new N8NClient(envConfig);
      const workflows = await client.listWorkflows();

      if (workflows.length === 0) {
        console.log('No workflows found.');
        return;
      }

      const colId = 'ID'.padEnd(10);
      const colName = 'Name'.padEnd(50);
      const colStatus = 'Status';
      console.log(`${colId} ${colName} ${colStatus}`);
      console.log(`${'-'.repeat(10)} ${'-'.repeat(50)} ${'-'.repeat(10)}`);

      for (const w of workflows) {
        const id = String(w.id ?? '').padEnd(10);
        const name = w.name.padEnd(50);
        const status = w.active ? 'active' : 'inactive';
        console.log(`${id} ${name} ${status}`);
      }

      console.log(`\nTotal: ${workflows.length} workflow(s)\n`);
    } catch (err) {
      console.error('\nError:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ─── init ────────────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Create a starter n8n-cli-config.json in the current directory')
  .action(() => {
    const targetPath = path.join(process.cwd(), 'n8n-cli-config.json');

    if (fs.existsSync(targetPath)) {
      console.log(`Config already exists: ${targetPath}`);
      process.exit(0);
    }

    const examplePath = path.resolve(__dirname, '..', 'n8n-cli-config.example.json');

    const starter = {
      environments: {
        develop: {
          url: 'http://localhost:6678',
          apiKey: 'your-dev-n8n-api-key',
        },
        production: {
          url: 'https://your-prod-n8n-instance.example.com',
          apiKey: 'your-prod-n8n-api-key',
        },
      },
      source: 'develop',
      target: 'production',
    };

    const content = fs.existsSync(examplePath)
      ? fs.readFileSync(examplePath, 'utf-8')
      : JSON.stringify(starter, null, 2) + '\n';

    fs.writeFileSync(targetPath, content, 'utf-8');
    console.log(`\nCreated: ${targetPath}`);
    console.log('Edit it to add your environment URLs and API keys.\n');
  });

program.parse(process.argv);
