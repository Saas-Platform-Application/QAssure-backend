#!/usr/bin/env node

/**
 * QAssure CLI - Command Line Interface
 * @version 1.0.0
 */

const { program } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const packageJson = require('../package.json');

// Import commands
const authCommands = require('./commands/auth');
const moduleCommands = require('./commands/modules');
const userCommands = require('./commands/users');
const documentCommands = require('./commands/documents');
const capaCommands = require('./commands/capas');
const configCommands = require('./commands/config');
const healthCommands = require('./commands/health');

// Display banner
const showBanner = () => {
  console.log(
    chalk.cyan(
      figlet.textSync('QAssure', { horizontalLayout: 'default' })
    )
  );
  console.log(chalk.gray('  Enterprise Quality Management System CLI\n'));
};

// Main program setup
program
  .name('qassure')
  .description('QAssure Platform CLI - Manage your QMS from the command line')
  .version(packageJson.version, '-v, --version', 'Output the current version')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('--json', 'Output results as JSON')
  .option('--no-color', 'Disable colored output');

// Register command groups
program.addCommand(authCommands);
program.addCommand(moduleCommands);
program.addCommand(userCommands);
program.addCommand(documentCommands);
program.addCommand(capaCommands);
program.addCommand(configCommands);
program.addCommand(healthCommands);

// Default action - show help with banner
program.action(() => {
  showBanner();
  program.help();
});

// Error handling
program.showHelpAfterError('(add --help for additional information)');

// Parse arguments
program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});
