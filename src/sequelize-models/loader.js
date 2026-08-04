/**
 * Loads all Sequelize models in this directory and runs their associate() hooks.
 */
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');

const modelsDir = __dirname;
const files = fs.readdirSync(modelsDir).filter((file) =>
  file.endsWith('.js') && file !== path.basename(__filename)
);

// Require all model definition files so they register with Sequelize
files.forEach((file) => {
  // Skip index.js if present
  if (file === 'index.js') return;
  require(path.join(modelsDir, file));
});

// Run associate hooks if defined
const { models } = sequelize;
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

module.exports = models;
