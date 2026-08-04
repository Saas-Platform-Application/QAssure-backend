/**
 * QAssure CLI - User Commands
 */

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');
const inquirer = require('inquirer');
const axios = require('axios');
const { config } = require('./config');

const userCommand = new Command('users')
  .alias('user')
  .description('User management commands');

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
    active: chalk.green,
    inactive: chalk.gray,
    pending: chalk.yellow,
    suspended: chalk.red,
    locked: chalk.red
  };
  return (colors[status] || chalk.white)(status);
};

// List users
userCommand
  .command('list')
  .alias('ls')
  .description('List all users')
  .option('-s, --status <status>', 'Filter by status (active, inactive, pending)')
  .option('-r, --role <role>', 'Filter by role')
  .option('-l, --limit <number>', 'Number of results', '20')
  .option('-p, --page <number>', 'Page number', '1')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Fetching users...').start();
    
    try {
      const client = getClient();
      const params = {
        page: options.page,
        limit: options.limit
      };
      if (options.status) params.status = options.status;
      if (options.role) params.role = options.role;
      
      const response = await client.get('/users', { params });
      const { data, pagination } = response.data;
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(response.data, null, 2));
        return;
      }
      
      if (data.length === 0) {
        console.log(chalk.yellow('\nNo users found.\n'));
        return;
      }
      
      const table = new Table({
        head: [
          chalk.cyan('ID'),
          chalk.cyan('Email'),
          chalk.cyan('Name'),
          chalk.cyan('Status'),
          chalk.cyan('Roles'),
          chalk.cyan('Created')
        ],
        colWidths: [38, 30, 20, 10, 20, 12]
      });
      
      data.forEach(user => {
        const roles = user.roles?.map(r => r.code).join(', ') || 'N/A';
        const created = user.created_at?.substring(0, 10) || 'N/A';
        table.push([
          user.id,
          user.email.substring(0, 28),
          `${user.first_name || ''} ${user.last_name || ''}`.trim().substring(0, 18) || 'N/A',
          statusColor(user.status),
          roles.substring(0, 18),
          created
        ]);
      });
      
      console.log(`\n${table.toString()}`);
      console.log(chalk.gray(`\n  Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total)\n`));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch users'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Get user details
userCommand
  .command('get <userId>')
  .alias('show')
  .description('Get user details')
  .option('--json', 'Output as JSON')
  .action(async (userId, options) => {
    const spinner = ora('Fetching user...').start();
    
    try {
      const client = getClient();
      const response = await client.get(`/users/${userId}`);
      const user = response.data.data;
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(user, null, 2));
        return;
      }
      
      console.log(chalk.cyan(`\nUser: ${user.first_name} ${user.last_name}\n`));
      console.log(`  ID:         ${user.id}`);
      console.log(`  Email:      ${chalk.green(user.email)}`);
      console.log(`  First Name: ${user.first_name || 'N/A'}`);
      console.log(`  Last Name:  ${user.last_name || 'N/A'}`);
      console.log(`  Status:     ${statusColor(user.status)}`);
      console.log(`  Tenant ID:  ${user.tenant_id || 'N/A'}`);
      console.log(`  Department: ${user.department || 'N/A'}`);
      console.log(`  Title:      ${user.title || 'N/A'}`);
      console.log(`  Phone:      ${user.phone || 'N/A'}`);
      console.log(`  Created:    ${user.created_at}`);
      console.log(`  Updated:    ${user.updated_at}`);
      console.log(`  Last Login: ${user.last_login_at || 'Never'}`);
      
      if (user.roles?.length) {
        console.log(`\n  Roles:`);
        user.roles.forEach(role => {
          console.log(`    • ${chalk.yellow(role.code)} - ${role.name}`);
        });
      }
      
      console.log('');
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch user'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Create user
userCommand
  .command('create')
  .description('Create a new user')
  .option('-i, --interactive', 'Interactive mode')
  .option('-f, --file <path>', 'JSON file with user data')
  .action(async (options) => {
    let userData;
    
    if (options.file) {
      const fs = require('fs');
      try {
        userData = JSON.parse(fs.readFileSync(options.file, 'utf8'));
      } catch (e) {
        console.error(chalk.red(`Failed to read file: ${e.message}`));
        process.exit(1);
      }
    } else if (options.interactive) {
      userData = await inquirer.prompt([
        { type: 'input', name: 'email', message: 'Email:', validate: i => i.includes('@') || 'Invalid email' },
        { type: 'input', name: 'first_name', message: 'First Name:', validate: i => !!i },
        { type: 'input', name: 'last_name', message: 'Last Name:', validate: i => !!i },
        { type: 'password', name: 'password', message: 'Password:', mask: '*', validate: i => i.length >= 8 || 'Min 8 characters' },
        { type: 'input', name: 'department', message: 'Department (optional):' },
        { type: 'input', name: 'title', message: 'Job Title (optional):' }
      ]);
    } else {
      console.log(chalk.yellow('Please provide --file <path> or use --interactive mode'));
      process.exit(1);
    }
    
    const spinner = ora('Creating user...').start();
    
    try {
      const client = getClient();
      const response = await client.post('/users', userData);
      const user = response.data.data;
      
      spinner.succeed(chalk.green('User created successfully!'));
      console.log(`\n  ID:    ${user.id}`);
      console.log(`  Email: ${chalk.cyan(user.email)}\n`);
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to create user'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Activate user
userCommand
  .command('activate <userId>')
  .description('Activate a user')
  .action(async (userId) => {
    const spinner = ora('Activating user...').start();
    
    try {
      const client = getClient();
      await client.post(`/users/${userId}/activate`);
      
      spinner.succeed(chalk.green('User activated.'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to activate user'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Deactivate user
userCommand
  .command('deactivate <userId>')
  .description('Deactivate a user')
  .action(async (userId) => {
    const spinner = ora('Deactivating user...').start();
    
    try {
      const client = getClient();
      await client.post(`/users/${userId}/deactivate`);
      
      spinner.succeed(chalk.green('User deactivated.'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to deactivate user'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Assign role
userCommand
  .command('assign-role <userId> <roleId>')
  .description('Assign a role to a user')
  .action(async (userId, roleId) => {
    const spinner = ora('Assigning role...').start();
    
    try {
      const client = getClient();
      await client.post(`/users/${userId}/roles`, { role_id: roleId });
      
      spinner.succeed(chalk.green('Role assigned successfully.'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to assign role'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Remove role
userCommand
  .command('remove-role <userId> <roleId>')
  .description('Remove a role from a user')
  .action(async (userId, roleId) => {
    const spinner = ora('Removing role...').start();
    
    try {
      const client = getClient();
      await client.delete(`/users/${userId}/roles/${roleId}`);
      
      spinner.succeed(chalk.green('Role removed successfully.'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to remove role'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Delete user
userCommand
  .command('delete <userId>')
  .alias('rm')
  .description('Delete a user')
  .option('-f, --force', 'Skip confirmation')
  .action(async (userId, options) => {
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to delete user ${userId}?`,
          default: false
        }
      ]);
      
      if (!confirm) {
        console.log(chalk.yellow('Aborted.'));
        return;
      }
    }
    
    const spinner = ora('Deleting user...').start();
    
    try {
      const client = getClient();
      await client.delete(`/users/${userId}`);
      
      spinner.succeed(chalk.green('User deleted.'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to delete user'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

module.exports = userCommand;
