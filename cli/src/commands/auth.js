/**
 * QAssure CLI - Authentication Commands
 */

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const axios = require('axios');
const { config } = require('./config');

const authCommand = new Command('auth')
  .description('Authentication commands');

// Helper to get API client
const getClient = () => {
  const baseUrl = config.get('apiUrl');
  const apiVersion = config.get('apiVersion');
  
  return axios.create({
    baseURL: `${baseUrl}/api/${apiVersion}`,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'QAssure-CLI/1.0.0'
    }
  });
};

// Login
authCommand
  .command('login')
  .description('Authenticate with QAssure Platform')
  .option('-e, --email <email>', 'Email address')
  .option('-p, --password <password>', 'Password (not recommended, use interactive)')
  .action(async (options) => {
    let email = options.email;
    let password = options.password;
    
    // Interactive prompts if not provided
    if (!email || !password) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'email',
          message: 'Email:',
          when: !email,
          validate: (input) => input.includes('@') || 'Please enter a valid email'
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          when: !password,
          mask: '*'
        }
      ]);
      
      email = email || answers.email;
      password = password || answers.password;
    }
    
    const spinner = ora('Authenticating...').start();
    
    try {
      const client = getClient();
      const response = await client.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const { tokens, user } = response.data.data;
        
        config.set('accessToken', tokens.access_token);
        config.set('refreshToken', tokens.refresh_token);
        
        spinner.succeed(chalk.green('Authentication successful!'));
        console.log(`\n  Logged in as: ${chalk.cyan(user.email)}`);
        console.log(`  Tenant ID:    ${chalk.cyan(user.tenant_id || 'N/A')}`);
        console.log(`  Token expires in: ${chalk.yellow(tokens.expires_in + 's')}\n`);
      } else {
        spinner.fail(chalk.red('Authentication failed'));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red('Authentication failed'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Logout
authCommand
  .command('logout')
  .description('End current session')
  .option('-a, --all', 'Logout from all sessions')
  .action(async (options) => {
    const token = config.get('accessToken');
    
    if (!token) {
      console.log(chalk.yellow('Not currently logged in.'));
      return;
    }
    
    const spinner = ora('Logging out...').start();
    
    try {
      const client = getClient();
      client.defaults.headers.Authorization = `Bearer ${token}`;
      
      const endpoint = options.all ? '/auth/logout-all' : '/auth/logout';
      await client.post(endpoint);
      
      config.delete('accessToken');
      config.delete('refreshToken');
      
      spinner.succeed(chalk.green(options.all ? 'Logged out from all sessions.' : 'Logged out successfully.'));
    } catch (error) {
      // Clear tokens even if API call fails
      config.delete('accessToken');
      config.delete('refreshToken');
      
      spinner.succeed(chalk.green('Logged out (session cleared).'));
    }
  });

// Show current user
authCommand
  .command('whoami')
  .alias('me')
  .description('Display current authenticated user')
  .action(async () => {
    const token = config.get('accessToken');
    
    if (!token) {
      console.log(chalk.yellow('Not logged in. Run: qassure auth login'));
      process.exit(1);
    }
    
    const spinner = ora('Fetching user info...').start();
    
    try {
      const client = getClient();
      client.defaults.headers.Authorization = `Bearer ${token}`;
      
      const response = await client.get('/auth/me');
      const user = response.data.data;
      
      spinner.stop();
      
      console.log(chalk.cyan('\nCurrent User:\n'));
      console.log(`  ID:         ${user.id}`);
      console.log(`  Email:      ${chalk.green(user.email)}`);
      console.log(`  Name:       ${user.first_name} ${user.last_name}`);
      console.log(`  Status:     ${user.status === 'active' ? chalk.green(user.status) : chalk.yellow(user.status)}`);
      console.log(`  Tenant:     ${user.tenant_id || 'N/A'}`);
      console.log(`  Roles:      ${user.roles?.map(r => r.code).join(', ') || 'N/A'}`);
      console.log('');
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch user info'));
      
      if (error.response?.status === 401) {
        console.log(chalk.yellow('Session expired. Please login again.'));
        config.delete('accessToken');
        config.delete('refreshToken');
      } else {
        const message = error.response?.data?.error?.message || error.message;
        console.error(chalk.red(`  ${message}`));
      }
      process.exit(1);
    }
  });

// Refresh token
authCommand
  .command('refresh')
  .description('Refresh authentication token')
  .action(async () => {
    const refreshToken = config.get('refreshToken');
    
    if (!refreshToken) {
      console.log(chalk.yellow('No refresh token available. Please login again.'));
      process.exit(1);
    }
    
    const spinner = ora('Refreshing token...').start();
    
    try {
      const client = getClient();
      const response = await client.post('/auth/refresh', {
        refresh_token: refreshToken
      });
      
      if (response.data.success) {
        config.set('accessToken', response.data.data.access_token);
        spinner.succeed(chalk.green('Token refreshed successfully.'));
      } else {
        throw new Error('Refresh failed');
      }
    } catch (error) {
      spinner.fail(chalk.red('Token refresh failed'));
      console.log(chalk.yellow('Please login again: qassure auth login'));
      config.delete('accessToken');
      config.delete('refreshToken');
      process.exit(1);
    }
  });

// Check auth status
authCommand
  .command('status')
  .description('Check authentication status')
  .action(() => {
    const token = config.get('accessToken');
    const apiUrl = config.get('apiUrl');
    
    console.log(chalk.cyan('\nAuthentication Status:\n'));
    console.log(`  API URL:      ${apiUrl}`);
    console.log(`  Logged in:    ${token ? chalk.green('Yes') : chalk.red('No')}`);
    
    if (token) {
      // Decode JWT to show expiry (without verification)
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const expiry = new Date(payload.exp * 1000);
        const isExpired = expiry < new Date();
        
        console.log(`  Token expiry: ${isExpired ? chalk.red(expiry.toISOString() + ' (EXPIRED)') : chalk.green(expiry.toISOString())}`);
      } catch (e) {
        console.log(`  Token expiry: ${chalk.yellow('Unknown')}`);
      }
    }
    console.log('');
  });

module.exports = authCommand;
module.exports.getClient = getClient;
