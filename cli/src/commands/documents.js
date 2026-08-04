/**
 * QAssure CLI - Document Commands
 */

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');
const inquirer = require('inquirer');
const axios = require('axios');
const { config } = require('./config');

const documentCommand = new Command('documents')
  .alias('docs')
  .description('Document management commands');

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
    pending_review: chalk.yellow,
    in_review: chalk.cyan,
    approved: chalk.green,
    effective: chalk.green.bold,
    rejected: chalk.red,
    obsolete: chalk.magenta,
    archived: chalk.gray
  };
  return (colors[status] || chalk.white)(status);
};

// List documents
documentCommand
  .command('list')
  .alias('ls')
  .description('List all documents')
  .option('-s, --status <status>', 'Filter by status')
  .option('-t, --type <type>', 'Filter by document type')
  .option('-l, --limit <number>', 'Number of results', '20')
  .option('-p, --page <number>', 'Page number', '1')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Fetching documents...').start();
    
    try {
      const client = getClient();
      const params = {
        page: options.page,
        limit: options.limit
      };
      if (options.status) params.status = options.status;
      if (options.type) params.document_type = options.type;
      
      const response = await client.get('/documents', { params });
      const { data, pagination } = response.data;
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(response.data, null, 2));
        return;
      }
      
      if (data.length === 0) {
        console.log(chalk.yellow('\nNo documents found.\n'));
        return;
      }
      
      const table = new Table({
        head: [
          chalk.cyan('Doc Number'),
          chalk.cyan('Title'),
          chalk.cyan('Type'),
          chalk.cyan('Version'),
          chalk.cyan('Status'),
          chalk.cyan('Updated')
        ],
        colWidths: [15, 30, 12, 10, 15, 12]
      });
      
      data.forEach(doc => {
        table.push([
          doc.document_number || 'N/A',
          doc.title.substring(0, 28),
          doc.document_type?.substring(0, 10) || 'N/A',
          doc.version || '1.0',
          statusColor(doc.status),
          doc.updated_at?.substring(0, 10) || 'N/A'
        ]);
      });
      
      console.log(`\n${table.toString()}`);
      console.log(chalk.gray(`\n  Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total)\n`));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch documents'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Get document details
documentCommand
  .command('get <documentId>')
  .alias('show')
  .description('Get document details')
  .option('--json', 'Output as JSON')
  .action(async (documentId, options) => {
    const spinner = ora('Fetching document...').start();
    
    try {
      const client = getClient();
      const response = await client.get(`/documents/${documentId}`);
      const doc = response.data.data;
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(doc, null, 2));
        return;
      }
      
      console.log(chalk.cyan(`\nDocument: ${doc.title}\n`));
      console.log(`  ID:              ${doc.id}`);
      console.log(`  Document Number: ${chalk.green(doc.document_number || 'N/A')}`);
      console.log(`  Title:           ${doc.title}`);
      console.log(`  Type:            ${doc.document_type || 'N/A'}`);
      console.log(`  Version:         ${doc.version || '1.0'}`);
      console.log(`  Status:          ${statusColor(doc.status)}`);
      console.log(`  Category:        ${doc.category || 'N/A'}`);
      console.log(`  Owner:           ${doc.owner_id || 'N/A'}`);
      console.log(`  Effective Date:  ${doc.effective_date || 'N/A'}`);
      console.log(`  Review Date:     ${doc.review_date || 'N/A'}`);
      console.log(`  Created:         ${doc.created_at}`);
      console.log(`  Updated:         ${doc.updated_at}`);
      
      if (doc.description) {
        console.log(`\n  Description:`);
        console.log(`    ${doc.description.substring(0, 200)}${doc.description.length > 200 ? '...' : ''}`);
      }
      
      console.log('');
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch document'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Create document
documentCommand
  .command('create')
  .description('Create a new document')
  .option('-i, --interactive', 'Interactive mode')
  .option('-f, --file <path>', 'JSON file with document data')
  .action(async (options) => {
    let docData;
    
    if (options.file) {
      const fs = require('fs');
      try {
        docData = JSON.parse(fs.readFileSync(options.file, 'utf8'));
      } catch (e) {
        console.error(chalk.red(`Failed to read file: ${e.message}`));
        process.exit(1);
      }
    } else if (options.interactive) {
      docData = await inquirer.prompt([
        { type: 'input', name: 'title', message: 'Title:', validate: i => !!i },
        { 
          type: 'list', 
          name: 'document_type', 
          message: 'Document Type:', 
          choices: ['SOP', 'WI', 'FORM', 'POLICY', 'SPEC', 'PROTOCOL', 'REPORT', 'OTHER']
        },
        { type: 'input', name: 'document_number', message: 'Document Number (optional):' },
        { type: 'input', name: 'description', message: 'Description:' },
        { 
          type: 'list', 
          name: 'category', 
          message: 'Category:', 
          choices: ['Quality', 'Manufacturing', 'Laboratory', 'Regulatory', 'Safety', 'Training', 'Other']
        }
      ]);
    } else {
      console.log(chalk.yellow('Please provide --file <path> or use --interactive mode'));
      process.exit(1);
    }
    
    const spinner = ora('Creating document...').start();
    
    try {
      const client = getClient();
      const response = await client.post('/documents', docData);
      const doc = response.data.data;
      
      spinner.succeed(chalk.green('Document created successfully!'));
      console.log(`\n  ID:     ${doc.id}`);
      console.log(`  Number: ${chalk.cyan(doc.document_number || 'Auto-generated')}`);
      console.log(`  Status: ${statusColor(doc.status)}\n`);
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to create document'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Submit for review
documentCommand
  .command('submit <documentId>')
  .description('Submit document for review')
  .action(async (documentId) => {
    const spinner = ora('Submitting for review...').start();
    
    try {
      const client = getClient();
      const response = await client.post(`/documents/${documentId}/submit`);
      const doc = response.data.data;
      
      spinner.succeed(chalk.green('Document submitted for review!'));
      console.log(`  Status: ${statusColor(doc.status)}\n`);
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to submit document'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Approve document
documentCommand
  .command('approve <documentId>')
  .description('Approve a document')
  .option('-c, --comments <comments>', 'Approval comments')
  .action(async (documentId, options) => {
    const spinner = ora('Approving document...').start();
    
    try {
      const client = getClient();
      const response = await client.post(`/documents/${documentId}/approve`, {
        comments: options.comments
      });
      const doc = response.data.data;
      
      spinner.succeed(chalk.green('Document approved!'));
      console.log(`  Status: ${statusColor(doc.status)}\n`);
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to approve document'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Reject document
documentCommand
  .command('reject <documentId>')
  .description('Reject a document')
  .option('-r, --reason <reason>', 'Rejection reason (required)')
  .action(async (documentId, options) => {
    let reason = options.reason;
    
    if (!reason) {
      const answers = await inquirer.prompt([
        { type: 'input', name: 'reason', message: 'Rejection reason:', validate: i => !!i }
      ]);
      reason = answers.reason;
    }
    
    const spinner = ora('Rejecting document...').start();
    
    try {
      const client = getClient();
      const response = await client.post(`/documents/${documentId}/reject`, { reason });
      const doc = response.data.data;
      
      spinner.succeed(chalk.yellow('Document rejected.'));
      console.log(`  Status: ${statusColor(doc.status)}\n`);
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to reject document'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Get document versions
documentCommand
  .command('versions <documentId>')
  .description('List document versions')
  .option('--json', 'Output as JSON')
  .action(async (documentId, options) => {
    const spinner = ora('Fetching versions...').start();
    
    try {
      const client = getClient();
      const response = await client.get(`/documents/${documentId}/versions`);
      const versions = response.data.data;
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(versions, null, 2));
        return;
      }
      
      if (versions.length === 0) {
        console.log(chalk.yellow('\nNo versions found.\n'));
        return;
      }
      
      console.log(chalk.cyan('\nDocument Versions:\n'));
      
      const table = new Table({
        head: [
          chalk.cyan('Version'),
          chalk.cyan('Status'),
          chalk.cyan('Created By'),
          chalk.cyan('Created At'),
          chalk.cyan('Changes')
        ],
        colWidths: [10, 15, 20, 22, 30]
      });
      
      versions.forEach(ver => {
        table.push([
          ver.version,
          statusColor(ver.status),
          ver.created_by?.substring(0, 18) || 'N/A',
          ver.created_at?.substring(0, 19) || 'N/A',
          ver.change_summary?.substring(0, 28) || 'N/A'
        ]);
      });
      
      console.log(table.toString());
      console.log('');
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch versions'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Delete document
documentCommand
  .command('delete <documentId>')
  .alias('rm')
  .description('Delete a document')
  .option('-f, --force', 'Skip confirmation')
  .action(async (documentId, options) => {
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to delete document ${documentId}?`,
          default: false
        }
      ]);
      
      if (!confirm) {
        console.log(chalk.yellow('Aborted.'));
        return;
      }
    }
    
    const spinner = ora('Deleting document...').start();
    
    try {
      const client = getClient();
      await client.delete(`/documents/${documentId}`);
      
      spinner.succeed(chalk.green('Document deleted.'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to delete document'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

module.exports = documentCommand;
