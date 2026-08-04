/**
 * QAssure CLI - Module Commands
 */

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');
const inquirer = require('inquirer');
const axios = require('axios');
const { config } = require('./config');

const moduleCommand = new Command('modules')
  .alias('mod')
  .description('Module registry management');

// Helper to get authenticated client
const getClient = () => {
  const baseUrl = config.get('apiUrl');
  const apiVersion = config.get('apiVersion');
  const token = config.get('accessToken');
  
  if (!token) {
    console.error(chalk.red('Not authenticated. Run: qassure auth login'));
    process.exit(1);
  }
  
  return axios.create({
    baseURL: `${baseUrl}/api/${apiVersion}`,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'QAssure-CLI/1.0.0'
    }
  });
};

// Status color helper
const statusColor = (status) => {
  const colors = {
    running: chalk.green,
    healthy: chalk.green,
    pending: chalk.yellow,
    starting: chalk.cyan,
    stopping: chalk.yellow,
    stopped: chalk.gray,
    failed: chalk.red,
    unhealthy: chalk.red,
    deprecated: chalk.magenta,
    maintenance: chalk.blue
  };
  return (colors[status] || chalk.white)(status);
};

// List modules
moduleCommand
  .command('list')
  .alias('ls')
  .description('List all registered modules')
  .option('-s, --status <status>', 'Filter by status')
  .option('-l, --limit <number>', 'Number of results', '20')
  .option('-p, --page <number>', 'Page number', '1')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Fetching modules...').start();
    
    try {
      const client = getClient();
      const params = {
        page: options.page,
        limit: options.limit
      };
      if (options.status) params.status = options.status;
      
      const response = await client.get('/modules', { params });
      const { data, pagination } = response.data;
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(response.data, null, 2));
        return;
      }
      
      if (data.length === 0) {
        console.log(chalk.yellow('\nNo modules found.\n'));
        return;
      }
      
      const table = new Table({
        head: [
          chalk.cyan('Module ID'),
          chalk.cyan('Name'),
          chalk.cyan('Version'),
          chalk.cyan('Status'),
          chalk.cyan('Health'),
          chalk.cyan('URL')
        ],
        colWidths: [15, 25, 10, 12, 10, 30]
      });
      
      data.forEach(mod => {
        table.push([
          mod.module_id,
          mod.name.substring(0, 23),
          mod.version,
          statusColor(mod.status),
          statusColor(mod.health_status || 'unknown'),
          mod.base_url?.substring(0, 28) || 'N/A'
        ]);
      });
      
      console.log(`\n${table.toString()}`);
      console.log(chalk.gray(`\n  Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total)\n`));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch modules'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Get module details
moduleCommand
  .command('get <moduleId>')
  .alias('show')
  .description('Get module details')
  .option('--json', 'Output as JSON')
  .action(async (moduleId, options) => {
    const spinner = ora('Fetching module...').start();
    
    try {
      const client = getClient();
      const response = await client.get(`/modules/${moduleId}`);
      const mod = response.data.data;
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(mod, null, 2));
        return;
      }
      
      console.log(chalk.cyan(`\nModule: ${mod.name}\n`));
      console.log(`  ID:              ${mod.id}`);
      console.log(`  Module ID:       ${chalk.green(mod.module_id)}`);
      console.log(`  Version:         ${mod.version}`);
      console.log(`  Status:          ${statusColor(mod.status)}`);
      console.log(`  Health:          ${statusColor(mod.health_status || 'unknown')}`);
      console.log(`  Base URL:        ${mod.base_url}`);
      console.log(`  Health Endpoint: ${mod.health_endpoint}`);
      console.log(`  Runtime:         ${mod.runtime_language || 'N/A'}`);
      console.log(`  Framework:       ${mod.framework || 'N/A'}`);
      console.log(`  Replicas:        ${mod.min_replicas}-${mod.max_replicas}`);
      console.log(`  CPU:             ${mod.cpu_request} / ${mod.cpu_limit}`);
      console.log(`  Memory:          ${mod.memory_request} / ${mod.memory_limit}`);
      console.log(`  Failures:        ${mod.consecutive_failures || 0}`);
      console.log(`  Last Check:      ${mod.last_health_check || 'Never'}`);
      console.log(`  Created:         ${mod.created_at}`);
      console.log(`  Updated:         ${mod.updated_at}`);
      
      if (mod.endpoints) {
        console.log(`\n  Endpoints:`);
        const endpoints = typeof mod.endpoints === 'string' ? JSON.parse(mod.endpoints) : mod.endpoints;
        endpoints.forEach(ep => {
          console.log(`    ${chalk.yellow(ep.method.padEnd(6))} ${ep.path}`);
        });
      }
      
      if (mod.kafka_topics) {
        const topics = typeof mod.kafka_topics === 'string' ? JSON.parse(mod.kafka_topics) : mod.kafka_topics;
        console.log(`\n  Kafka Topics:`);
        if (topics.publish?.length) console.log(`    Publish:   ${topics.publish.join(', ')}`);
        if (topics.subscribe?.length) console.log(`    Subscribe: ${topics.subscribe.join(', ')}`);
      }
      
      console.log('');
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch module'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Register module
moduleCommand
  .command('register')
  .alias('create')
  .description('Register a new module')
  .option('-f, --file <path>', 'JSON file with module configuration')
  .option('-i, --interactive', 'Interactive mode')
  .action(async (options) => {
    let moduleData;
    
    if (options.file) {
      const fs = require('fs');
      try {
        moduleData = JSON.parse(fs.readFileSync(options.file, 'utf8'));
      } catch (e) {
        console.error(chalk.red(`Failed to read file: ${e.message}`));
        process.exit(1);
      }
    } else if (options.interactive) {
      const answers = await inquirer.prompt([
        { type: 'input', name: 'module_id', message: 'Module ID (unique):', validate: i => !!i },
        { type: 'input', name: 'name', message: 'Module Name:', validate: i => !!i },
        { type: 'input', name: 'version', message: 'Version:', default: '1.0.0' },
        { type: 'input', name: 'base_url', message: 'Base URL:', validate: i => !!i },
        { type: 'input', name: 'health_endpoint', message: 'Health Endpoint:', default: '/health' },
        { type: 'list', name: 'runtime_language', message: 'Runtime:', choices: ['nodejs', 'python', 'java', 'go', 'other'] },
        { type: 'input', name: 'description', message: 'Description (optional):' }
      ]);
      moduleData = answers;
    } else {
      console.log(chalk.yellow('Please provide --file <path> or use --interactive mode'));
      console.log(chalk.gray('\nExample JSON file:'));
      console.log(chalk.gray(JSON.stringify({
        module_id: 'my-module',
        name: 'My Module',
        version: '1.0.0',
        base_url: 'http://my-module:3001',
        health_endpoint: '/health',
        runtime_language: 'nodejs'
      }, null, 2)));
      process.exit(1);
    }
    
    const spinner = ora('Registering module...').start();
    
    try {
      const client = getClient();
      const response = await client.post('/modules', moduleData);
      const mod = response.data.data;
      
      spinner.succeed(chalk.green('Module registered successfully!'));
      console.log(`\n  ID:        ${mod.id}`);
      console.log(`  Module ID: ${chalk.cyan(mod.module_id)}`);
      console.log(`  Status:    ${statusColor(mod.status)}`);
      console.log(`\n  To start:  ${chalk.cyan(`qassure modules start ${mod.id}`)}\n`);
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to register module'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Start module
moduleCommand
  .command('start <moduleId>')
  .description('Start a module')
  .action(async (moduleId) => {
    const spinner = ora('Starting module...').start();
    
    try {
      const client = getClient();
      const response = await client.post(`/modules/${moduleId}/start`);
      const mod = response.data.data;
      
      spinner.succeed(chalk.green('Module started!'));
      console.log(`  Status: ${statusColor(mod.status)}\n`);
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to start module'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Stop module
moduleCommand
  .command('stop <moduleId>')
  .description('Stop a module')
  .option('-r, --reason <reason>', 'Reason for stopping')
  .action(async (moduleId, options) => {
    const spinner = ora('Stopping module...').start();
    
    try {
      const client = getClient();
      const response = await client.post(`/modules/${moduleId}/stop`, {
        reason: options.reason
      });
      const mod = response.data.data;
      
      spinner.succeed(chalk.green('Module stopped.'));
      console.log(`  Status: ${statusColor(mod.status)}\n`);
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to stop module'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Restart module
moduleCommand
  .command('restart <moduleId>')
  .description('Restart a module')
  .option('-r, --reason <reason>', 'Reason for restart')
  .action(async (moduleId, options) => {
    const spinner = ora('Restarting module...').start();
    
    try {
      const client = getClient();
      const response = await client.post(`/modules/${moduleId}/restart`, {
        reason: options.reason
      });
      const mod = response.data.data;
      
      spinner.succeed(chalk.green('Module restarted!'));
      console.log(`  Status: ${statusColor(mod.status)}\n`);
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to restart module'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Health check
moduleCommand
  .command('health <moduleId>')
  .description('Check module health')
  .action(async (moduleId) => {
    const spinner = ora('Checking health...').start();
    
    try {
      const client = getClient();
      const response = await client.post(`/modules/${moduleId}/health-check`);
      const health = response.data.data;
      
      spinner.stop();
      
      console.log(chalk.cyan('\nHealth Check Result:\n'));
      console.log(`  Module:        ${health.module_id}`);
      console.log(`  Status:        ${statusColor(health.status)}`);
      console.log(`  Module Status: ${statusColor(health.module_status)}`);
      console.log(`  Response Time: ${health.response_time ? health.response_time + 'ms' : 'N/A'}`);
      console.log(`  Failures:      ${health.consecutive_failures}`);
      if (health.error) {
        console.log(`  Error:         ${chalk.red(health.error)}`);
      }
      console.log('');
      
    } catch (error) {
      spinner.fail(chalk.red('Health check failed'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Module stats
moduleCommand
  .command('stats')
  .description('Show module statistics')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Fetching stats...').start();
    
    try {
      const client = getClient();
      const response = await client.get('/modules/stats');
      const stats = response.data.data;
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
        return;
      }
      
      console.log(chalk.cyan('\nModule Statistics:\n'));
      console.log(`  Total Modules: ${chalk.green(stats.total)}`);
      
      console.log('\n  By Status:');
      Object.entries(stats.by_status || {}).forEach(([status, count]) => {
        console.log(`    ${statusColor(status).padEnd(20)} ${count}`);
      });
      
      console.log('\n  By Health:');
      Object.entries(stats.by_health || {}).forEach(([status, count]) => {
        console.log(`    ${statusColor(status).padEnd(20)} ${count}`);
      });
      
      console.log('');
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch stats'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Show state transitions
moduleCommand
  .command('states')
  .description('Show available module states and transitions')
  .action(async () => {
    const spinner = ora('Fetching states...').start();
    
    try {
      const client = getClient();
      const response = await client.get('/modules/states');
      const { states, transitions } = response.data.data;
      
      spinner.stop();
      
      console.log(chalk.cyan('\nModule States:\n'));
      Object.values(states).forEach(state => {
        console.log(`  • ${statusColor(state)}`);
      });
      
      console.log(chalk.cyan('\nValid Transitions:\n'));
      Object.entries(transitions).forEach(([from, toStates]) => {
        console.log(`  ${statusColor(from)} → ${toStates.map(s => statusColor(s)).join(', ')}`);
      });
      
      console.log('');
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch states'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Delete module
moduleCommand
  .command('delete <moduleId>')
  .alias('rm')
  .description('Delete a module permanently')
  .option('-f, --force', 'Skip confirmation')
  .action(async (moduleId, options) => {
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to delete module ${moduleId}?`,
          default: false
        }
      ]);
      
      if (!confirm) {
        console.log(chalk.yellow('Aborted.'));
        return;
      }
    }
    
    const spinner = ora('Deleting module...').start();
    
    try {
      const client = getClient();
      await client.delete(`/modules/${moduleId}`);
      
      spinner.succeed(chalk.green('Module deleted.'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to delete module'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

module.exports = moduleCommand;
