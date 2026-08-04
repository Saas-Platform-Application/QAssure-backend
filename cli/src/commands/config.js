/**
 * QAssure CLI - Configuration Commands
 */

const { Command } = require('commander');
const chalk = require('chalk');
const Conf = require('conf');
const inquirer = require('inquirer');

const config = new Conf({
  projectName: 'qassure-cli',
  schema: {
    apiUrl: { type: 'string', default: 'https://api.qassure.ai' },
    apiVersion: { type: 'string', default: 'v1' },
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    tenantId: { type: 'string' },
    defaultFormat: { type: 'string', default: 'table' }
  }
});

const configCommand = new Command('config')
  .description('Manage CLI configuration');

// Show current config
configCommand
  .command('show')
  .description('Display current configuration')
  .option('--show-tokens', 'Show authentication tokens')
  .action((options) => {
    console.log(chalk.cyan('\nQAssure CLI Configuration:\n'));
    console.log(`  API URL:        ${chalk.green(config.get('apiUrl'))}`);
    console.log(`  API Version:    ${chalk.green(config.get('apiVersion'))}`);
    console.log(`  Tenant ID:      ${chalk.green(config.get('tenantId') || '(not set)')}`);
    console.log(`  Default Format: ${chalk.green(config.get('defaultFormat'))}`);
    
    if (options.showTokens) {
      const token = config.get('accessToken');
      console.log(`  Access Token:   ${chalk.yellow(token ? token.substring(0, 20) + '...' : '(not set)')}`);
    } else {
      console.log(`  Access Token:   ${chalk.yellow(config.get('accessToken') ? '(set)' : '(not set)')}`);
    }
    
    console.log(`\n  Config file:    ${chalk.gray(config.path)}\n`);
  });

// Set config value
configCommand
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action((key, value) => {
    const validKeys = ['apiUrl', 'apiVersion', 'tenantId', 'defaultFormat'];
    
    if (!validKeys.includes(key)) {
      console.error(chalk.red(`Invalid key: ${key}`));
      console.log(`Valid keys: ${validKeys.join(', ')}`);
      process.exit(1);
    }
    
    config.set(key, value);
    console.log(chalk.green(`✓ Set ${key} = ${value}`));
  });

// Get config value
configCommand
  .command('get <key>')
  .description('Get a configuration value')
  .action((key) => {
    const value = config.get(key);
    if (value !== undefined) {
      console.log(value);
    } else {
      console.error(chalk.red(`Key not found: ${key}`));
      process.exit(1);
    }
  });

// Interactive setup
configCommand
  .command('init')
  .description('Interactive configuration setup')
  .action(async () => {
    console.log(chalk.cyan('\nQAssure CLI Setup\n'));
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiUrl',
        message: 'API URL:',
        default: config.get('apiUrl')
      },
      {
        type: 'input',
        name: 'tenantId',
        message: 'Tenant ID (optional):',
        default: config.get('tenantId')
      },
      {
        type: 'list',
        name: 'defaultFormat',
        message: 'Default output format:',
        choices: ['table', 'json', 'yaml'],
        default: config.get('defaultFormat')
      }
    ]);
    
    config.set('apiUrl', answers.apiUrl);
    if (answers.tenantId) config.set('tenantId', answers.tenantId);
    config.set('defaultFormat', answers.defaultFormat);
    
    console.log(chalk.green('\n✓ Configuration saved successfully!\n'));
    console.log(`  Run ${chalk.cyan('qassure auth login')} to authenticate.\n`);
  });

// Reset config
configCommand
  .command('reset')
  .description('Reset configuration to defaults')
  .option('-f, --force', 'Skip confirmation')
  .action(async (options) => {
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to reset all configuration?',
          default: false
        }
      ]);
      
      if (!confirm) {
        console.log(chalk.yellow('Aborted.'));
        return;
      }
    }
    
    config.clear();
    console.log(chalk.green('✓ Configuration reset to defaults.'));
  });

// Export config object for use by other commands
module.exports = configCommand;
module.exports.config = config;
