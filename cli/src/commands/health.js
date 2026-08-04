/**
 * QAssure CLI - Health Commands
 */

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const axios = require('axios');
const { config } = require('./config');

const healthCommand = new Command('health')
  .description('Platform health check commands');

// Helper to get client (no auth required for basic health)
const getClient = (requireAuth = false) => {
  const baseUrl = config.get('apiUrl');
  const apiVersion = config.get('apiVersion');
  const token = config.get('accessToken');
  
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'QAssure-CLI/1.0.0'
  };
  
  if (requireAuth) {
    if (!token) {
      console.error(chalk.red('Not authenticated. Run: qassure auth login'));
      process.exit(1);
    }
    headers.Authorization = `Bearer ${token}`;
  }
  
  return axios.create({
    baseURL: `${baseUrl}/api/${apiVersion}`,
    timeout: 10000,
    headers
  });
};

// Status color helper
const statusColor = (status) => {
  if (status === 'healthy' || status === 'ok' || status === 'up' || status === true) {
    return chalk.green('✓ healthy');
  } else if (status === 'degraded' || status === 'warning') {
    return chalk.yellow('⚠ degraded');
  } else {
    return chalk.red('✗ unhealthy');
  }
};

// Basic health check
healthCommand
  .command('check')
  .alias('status')
  .description('Check platform health status')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Checking platform health...').start();
    
    try {
      const client = getClient();
      const response = await client.get('/health');
      const health = response.data;
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(health, null, 2));
        return;
      }
      
      console.log(chalk.cyan('\nQAssure Platform Health\n'));
      console.log(`  API URL:    ${config.get('apiUrl')}`);
      console.log(`  Status:     ${statusColor(health.status || health.data?.status)}`);
      console.log(`  Timestamp:  ${health.timestamp || new Date().toISOString()}`);
      console.log('');
      
    } catch (error) {
      spinner.fail(chalk.red('Health check failed'));
      
      if (error.code === 'ECONNREFUSED') {
        console.error(chalk.red(`  Cannot connect to ${config.get('apiUrl')}`));
        console.error(chalk.yellow('  Check if the API server is running.'));
      } else if (error.code === 'ETIMEDOUT') {
        console.error(chalk.red('  Connection timed out'));
      } else {
        const message = error.response?.data?.error?.message || error.message;
        console.error(chalk.red(`  ${message}`));
      }
      process.exit(1);
    }
  });

// Detailed health check
healthCommand
  .command('detailed')
  .alias('full')
  .description('Get detailed health status of all services')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Fetching detailed health status...').start();
    
    try {
      const client = getClient(true);
      const response = await client.get('/health/detailed');
      const health = response.data.data || response.data;
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(health, null, 2));
        return;
      }
      
      console.log(chalk.cyan('\nQAssure Platform - Detailed Health\n'));
      console.log(`  Overall Status: ${statusColor(health.status)}`);
      console.log(`  Timestamp:      ${health.timestamp || new Date().toISOString()}`);
      console.log(`  Uptime:         ${health.uptime || 'N/A'}`);
      console.log(`  Version:        ${health.version || 'N/A'}`);
      
      // Services
      if (health.services) {
        console.log(chalk.cyan('\n  Services:\n'));
        Object.entries(health.services).forEach(([name, service]) => {
          const status = typeof service === 'object' ? service.status : service;
          const latency = typeof service === 'object' && service.latency ? ` (${service.latency}ms)` : '';
          console.log(`    ${name.padEnd(20)} ${statusColor(status)}${latency}`);
        });
      }
      
      // Database
      if (health.database) {
        console.log(chalk.cyan('\n  Database:\n'));
        console.log(`    Status:      ${statusColor(health.database.status)}`);
        console.log(`    Connections: ${health.database.connections || 'N/A'}`);
        console.log(`    Pool Size:   ${health.database.poolSize || 'N/A'}`);
      }
      
      // Redis
      if (health.redis) {
        console.log(chalk.cyan('\n  Redis:\n'));
        console.log(`    Status:      ${statusColor(health.redis.status)}`);
        console.log(`    Memory:      ${health.redis.memory || 'N/A'}`);
        console.log(`    Clients:     ${health.redis.clients || 'N/A'}`);
      }
      
      // Kafka
      if (health.kafka) {
        console.log(chalk.cyan('\n  Kafka:\n'));
        console.log(`    Status:      ${statusColor(health.kafka.status)}`);
        console.log(`    Brokers:     ${health.kafka.brokers || 'N/A'}`);
      }
      
      // Elasticsearch
      if (health.elasticsearch) {
        console.log(chalk.cyan('\n  Elasticsearch:\n'));
        console.log(`    Status:      ${statusColor(health.elasticsearch.status)}`);
        console.log(`    Cluster:     ${health.elasticsearch.cluster || 'N/A'}`);
      }
      
      // Memory
      if (health.memory) {
        console.log(chalk.cyan('\n  Memory:\n'));
        console.log(`    Used:        ${health.memory.used || 'N/A'}`);
        console.log(`    Total:       ${health.memory.total || 'N/A'}`);
        console.log(`    Percentage:  ${health.memory.percentage || 'N/A'}%`);
      }
      
      console.log('');
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch detailed health'));
      const message = error.response?.data?.error?.message || error.message;
      console.error(chalk.red(`  ${message}`));
      process.exit(1);
    }
  });

// Readiness check
healthCommand
  .command('ready')
  .description('Check if platform is ready to accept traffic')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Checking readiness...').start();
    
    try {
      const client = getClient();
      const response = await client.get('/health/ready');
      const data = response.data;
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }
      
      const ready = data.ready || data.status === 'ready' || data.status === 'ok';
      
      if (ready) {
        console.log(chalk.green('\n✓ Platform is ready to accept traffic\n'));
      } else {
        console.log(chalk.yellow('\n⚠ Platform is not ready\n'));
        if (data.reason) {
          console.log(`  Reason: ${data.reason}`);
        }
      }
      
    } catch (error) {
      spinner.fail(chalk.red('Readiness check failed'));
      console.log(chalk.red('\n✗ Platform is not ready\n'));
      process.exit(1);
    }
  });

// Liveness check
healthCommand
  .command('live')
  .description('Check if platform is alive')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Checking liveness...').start();
    
    try {
      const client = getClient();
      const response = await client.get('/health/live');
      const data = response.data;
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }
      
      console.log(chalk.green('\n✓ Platform is alive\n'));
      
    } catch (error) {
      spinner.fail(chalk.red('Liveness check failed'));
      console.log(chalk.red('\n✗ Platform is not responding\n'));
      process.exit(1);
    }
  });

// Ping test
healthCommand
  .command('ping')
  .description('Simple ping test to the API')
  .option('-c, --count <number>', 'Number of pings', '3')
  .action(async (options) => {
    const count = parseInt(options.count);
    const baseUrl = config.get('apiUrl');
    const client = getClient();
    
    console.log(chalk.cyan(`\nPinging ${baseUrl}...\n`));
    
    const results = [];
    
    for (let i = 0; i < count; i++) {
      const start = Date.now();
      try {
        await client.get('/health');
        const latency = Date.now() - start;
        results.push(latency);
        console.log(`  Ping ${i + 1}: ${chalk.green('OK')} - ${latency}ms`);
      } catch (error) {
        console.log(`  Ping ${i + 1}: ${chalk.red('FAILED')}`);
      }
      
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (results.length > 0) {
      const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
      const min = Math.min(...results);
      const max = Math.max(...results);
      
      console.log(chalk.cyan('\n  Statistics:\n'));
      console.log(`    Packets: ${count} sent, ${results.length} received, ${count - results.length} lost`);
      console.log(`    Latency: min=${min}ms, avg=${avg}ms, max=${max}ms`);
    }
    
    console.log('');
  });

// Watch health (continuous monitoring)
healthCommand
  .command('watch')
  .description('Continuously monitor platform health')
  .option('-i, --interval <seconds>', 'Check interval in seconds', '5')
  .action(async (options) => {
    const interval = parseInt(options.interval) * 1000;
    const client = getClient();
    
    console.log(chalk.cyan(`\nMonitoring platform health (Ctrl+C to stop)...\n`));
    
    const checkHealth = async () => {
      const timestamp = new Date().toISOString().substring(11, 19);
      try {
        const start = Date.now();
        const response = await client.get('/health');
        const latency = Date.now() - start;
        const status = response.data.status || response.data.data?.status || 'ok';
        
        if (status === 'healthy' || status === 'ok') {
          console.log(`  [${timestamp}] ${chalk.green('✓ healthy')} (${latency}ms)`);
        } else {
          console.log(`  [${timestamp}] ${chalk.yellow('⚠ ' + status)} (${latency}ms)`);
        }
      } catch (error) {
        console.log(`  [${timestamp}] ${chalk.red('✗ unhealthy')} - ${error.message}`);
      }
    };
    
    // Initial check
    await checkHealth();
    
    // Continuous monitoring
    const intervalId = setInterval(checkHealth, interval);
    
    // Handle exit
    process.on('SIGINT', () => {
      clearInterval(intervalId);
      console.log(chalk.cyan('\n\nMonitoring stopped.\n'));
      process.exit(0);
    });
  });

module.exports = healthCommand;
