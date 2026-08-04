/**
 * QAssure CLI - CAPA Commands
 */

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');
const inquirer = require('inquirer');
const axios = require('axios');
const { config } = require('./config');

const capaCommand = new Command('capas')
  .alias('capa')
  .description('CAPA management commands');

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
    draft: chalk.gray,
    open: chalk.cyan,
    investigation: chalk.yellow,
    root_cause_analysis: chalk.yellow,
    action_planning: chalk.blue,
    implementation: chalk.blue,
    verification: chalk.magenta,
    effectiveness_check: chalk.magenta,
    closed: chalk.green,
    cancelled: chalk.gray
  };
  return (colors[status] || chalk.white)(status);
};

// Priority color helper
const priorityColor = (priority) => {
  const colors = {
    low: chalk.gray,
    medium: chalk.yellow,
    high: chalk.red,
    critical: chalk.red.bold
  };
  return (colors[priority] || chalk.white)(priority);
};

// List CAPAs
capaCommand
  .command('list')
  .alias('ls')
  .description('List all CAPAs')
  .option('-s, --status <status>', 'Filter by status')
  .option('-p, --priority <priority>', 'Filter by priority (low, medium, high, critical)')
  .option('-t, --type <type>', 'Filter by type (corrective, preventive)')
  .option('-l, --limit <number>', 'Number of results', '20')
  .option('--page <number>', 'Page number', '1')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Fetching CAPAs...').start();
    
    try {
      const client = getClient();
      const params = {
        page: options.page,
        limit: options.limit
      };
      if (options.status) params.status = options.status;
      if (options.priority) params.priority = options.priority;
      if (options.type) params.capa_type = options.type;
      
      const response = await client.get('/capas', { params });
      const { data, pagination } = response.data;
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(response.data, null, 2));
        return;
      }
      
      if (data.length === 0) {
        console.log(chalk.yellow('\nNo CAPAs found.\n'));
        return;
      }
      
      const table = new Table({
        head: [
          chalk.cyan('CAPA #'),
          chalk.cyan('Title'),
          chalk.cyan('Type'),
          chalk.cyan('Priority'),
          chalk.cyan('Status'),
          chalk.cyan('Due Date')
        ],
        colWidths: [12, 30, 12, 10, 18, 12]
      });
      
      data.forEach(capa => {
        table.push([
          capa.capa_number || 'N/A',
          capa.title.substring(0, 28),
          capa.capa_type || 'N/A',
          priorityColor(capa.priority),
          statusColor(capa.status),
          capa.due_date?.substring(0, 10) || 'N/A'
        ]);
      });
      
      console.log(`\n${table.toString()}`);
      console.log(chalk.gray(`\n  Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total)\n`));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch CAPAs'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Get CAPA details
capaCommand
  .command('get <capaId>')
  .alias('show')
  .description('Get CAPA details')
  .option('--json', 'Output as JSON')
  .action(async (capaId, options) => {
    const spinner = ora('Fetching CAPA...').start();
    
    try {
      const client = getClient();
      const response = await client.get(`/capas/${capaId}`);
      const capa = response.data.data;
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(capa, null, 2));
        return;
      }
      
      console.log(chalk.cyan(`\nCAPA: ${capa.title}\n`));
      console.log(`  ID:            ${capa.id}`);
      console.log(`  CAPA Number:   ${chalk.green(capa.capa_number || 'N/A')}`);
      console.log(`  Title:         ${capa.title}`);
      console.log(`  Type:          ${capa.capa_type || 'N/A'}`);
      console.log(`  Priority:      ${priorityColor(capa.priority)}`);
      console.log(`  Status:        ${statusColor(capa.status)}`);
      console.log(`  Source:        ${capa.source || 'N/A'}`);
      console.log(`  Owner:         ${capa.owner_id || 'N/A'}`);
      console.log(`  Assigned To:   ${capa.assigned_to || 'N/A'}`);
      console.log(`  Due Date:      ${capa.due_date || 'N/A'}`);
      console.log(`  Initiated:     ${capa.initiated_date || 'N/A'}`);
      console.log(`  Closed:        ${capa.closed_date || 'N/A'}`);
      console.log(`  Created:       ${capa.created_at}`);
      console.log(`  Updated:       ${capa.updated_at}`);
      
      if (capa.description) {
        console.log(`\n  Description:`);
        console.log(`    ${capa.description.substring(0, 300)}${capa.description.length > 300 ? '...' : ''}`);
      }
      
      if (capa.root_causes?.length) {
        console.log(`\n  Root Causes:`);
        capa.root_causes.forEach((rc, i) => {
          console.log(`    ${i + 1}. ${rc.description || rc}`);
        });
      }
      
      if (capa.actions?.length) {
        console.log(`\n  Actions:`);
        capa.actions.forEach((action, i) => {
          const status = action.completed_at ? chalk.green('✓') : chalk.yellow('○');
          console.log(`    ${status} ${action.description || action.title || `Action ${i + 1}`}`);
        });
      }
      
      console.log('');
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch CAPA'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Create CAPA
capaCommand
  .command('create')
  .description('Create a new CAPA')
  .option('-i, --interactive', 'Interactive mode')
  .option('-f, --file <path>', 'JSON file with CAPA data')
  .action(async (options) => {
    let capaData;
    
    if (options.file) {
      const fs = require('fs');
      try {
        capaData = JSON.parse(fs.readFileSync(options.file, 'utf8'));
      } catch (e) {
        console.error(chalk.red(`Failed to read file: ${e.message}`));
        process.exit(1);
      }
    } else if (options.interactive) {
      capaData = await inquirer.prompt([
        { type: 'input', name: 'title', message: 'Title:', validate: i => !!i },
        { 
          type: 'list', 
          name: 'capa_type', 
          message: 'CAPA Type:', 
          choices: ['corrective', 'preventive']
        },
        { 
          type: 'list', 
          name: 'priority', 
          message: 'Priority:', 
          choices: ['low', 'medium', 'high', 'critical']
        },
        { 
          type: 'list', 
          name: 'source', 
          message: 'Source:', 
          choices: ['audit', 'complaint', 'deviation', 'observation', 'other']
        },
        { type: 'input', name: 'description', message: 'Description:' },
        { type: 'input', name: 'due_date', message: 'Due Date (YYYY-MM-DD):' }
      ]);
    } else {
      console.log(chalk.yellow('Please provide --file <path> or use --interactive mode'));
      process.exit(1);
    }
    
    const spinner = ora('Creating CAPA...').start();
    
    try {
      const client = getClient();
      const response = await client.post('/capas', capaData);
      const capa = response.data.data;
      
      spinner.succeed(chalk.green('CAPA created successfully!'));
      console.log(`\n  ID:          ${capa.id}`);
      console.log(`  CAPA Number: ${chalk.cyan(capa.capa_number || 'Auto-generated')}`);
      console.log(`  Status:      ${statusColor(capa.status)}\n`);
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to create CAPA'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Add action to CAPA
capaCommand
  .command('add-action <capaId>')
  .description('Add an action to a CAPA')
  .option('-d, --description <description>', 'Action description')
  .option('-a, --assignee <assignee>', 'Assignee user ID')
  .option('--due <date>', 'Due date (YYYY-MM-DD)')
  .action(async (capaId, options) => {
    let actionData = {};
    
    if (options.description) {
      actionData.description = options.description;
      actionData.assigned_to = options.assignee;
      actionData.due_date = options.due;
    } else {
      actionData = await inquirer.prompt([
        { type: 'input', name: 'description', message: 'Action Description:', validate: i => !!i },
        { type: 'input', name: 'assigned_to', message: 'Assignee User ID (optional):' },
        { type: 'input', name: 'due_date', message: 'Due Date (YYYY-MM-DD, optional):' }
      ]);
    }
    
    const spinner = ora('Adding action...').start();
    
    try {
      const client = getClient();
      const response = await client.post(`/capas/${capaId}/actions`, actionData);
      
      spinner.succeed(chalk.green('Action added successfully!'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to add action'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Complete action
capaCommand
  .command('complete-action <capaId> <actionId>')
  .description('Mark an action as complete')
  .action(async (capaId, actionId) => {
    const spinner = ora('Completing action...').start();
    
    try {
      const client = getClient();
      await client.post(`/capas/${capaId}/actions/${actionId}/complete`);
      
      spinner.succeed(chalk.green('Action marked as complete!'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to complete action'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Add root cause
capaCommand
  .command('add-root-cause <capaId>')
  .description('Add a root cause to a CAPA')
  .option('-d, --description <description>', 'Root cause description')
  .option('-c, --category <category>', 'Root cause category')
  .action(async (capaId, options) => {
    let rcData = {};
    
    if (options.description) {
      rcData.description = options.description;
      rcData.category = options.category;
    } else {
      rcData = await inquirer.prompt([
        { type: 'input', name: 'description', message: 'Root Cause Description:', validate: i => !!i },
        { 
          type: 'list', 
          name: 'category', 
          message: 'Category:', 
          choices: ['procedure', 'training', 'equipment', 'material', 'environment', 'human_error', 'other']
        }
      ]);
    }
    
    const spinner = ora('Adding root cause...').start();
    
    try {
      const client = getClient();
      await client.post(`/capas/${capaId}/root-causes`, rcData);
      
      spinner.succeed(chalk.green('Root cause added successfully!'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to add root cause'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Close CAPA
capaCommand
  .command('close <capaId>')
  .description('Close a CAPA')
  .option('-c, --comments <comments>', 'Closure comments')
  .action(async (capaId, options) => {
    let closeData = {};
    
    if (options.comments) {
      closeData.comments = options.comments;
    } else {
      closeData = await inquirer.prompt([
        { type: 'input', name: 'comments', message: 'Closure Comments:', validate: i => !!i },
        { type: 'confirm', name: 'effectiveness_verified', message: 'Effectiveness verified?', default: true }
      ]);
    }
    
    const spinner = ora('Closing CAPA...').start();
    
    try {
      const client = getClient();
      const response = await client.post(`/capas/${capaId}/close`, closeData);
      const capa = response.data.data;
      
      spinner.succeed(chalk.green('CAPA closed successfully!'));
      console.log(`  Status: ${statusColor(capa.status)}\n`);
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to close CAPA'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Verify effectiveness
capaCommand
  .command('verify <capaId>')
  .description('Verify CAPA effectiveness')
  .option('-e, --effective <boolean>', 'Was the CAPA effective?', 'true')
  .option('-c, --comments <comments>', 'Verification comments')
  .action(async (capaId, options) => {
    let verifyData = {};
    
    if (options.comments) {
      verifyData.effective = options.effective === 'true';
      verifyData.comments = options.comments;
    } else {
      verifyData = await inquirer.prompt([
        { type: 'confirm', name: 'effective', message: 'Was the CAPA effective?', default: true },
        { type: 'input', name: 'comments', message: 'Verification Comments:', validate: i => !!i }
      ]);
    }
    
    const spinner = ora('Verifying effectiveness...').start();
    
    try {
      const client = getClient();
      await client.post(`/capas/${capaId}/verify`, verifyData);
      
      spinner.succeed(chalk.green('Effectiveness verification recorded!'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to verify effectiveness'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Delete CAPA
capaCommand
  .command('delete <capaId>')
  .alias('rm')
  .description('Delete a CAPA')
  .option('-f, --force', 'Skip confirmation')
  .action(async (capaId, options) => {
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to delete CAPA ${capaId}?`,
          default: false
        }
      ]);
      
      if (!confirm) {
        console.log(chalk.yellow('Aborted.'));
        return;
      }
    }
    
    const spinner = ora('Deleting CAPA...').start();
    
    try {
      const client = getClient();
      await client.delete(`/capas/${capaId}`);
      
      spinner.succeed(chalk.green('CAPA deleted.'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to delete CAPA'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

module.exports = capaCommand;
