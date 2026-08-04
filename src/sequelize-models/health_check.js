const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Healthcheck = sequelize.define('Healthcheck', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,

    allowNull: false,
  },
  module_id: {
    type: DataTypes.UUID,

    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  response_time_ms: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  http_status: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  error_message: {
    type: DataTypes.TEXT(1000),

    allowNull: true,
  },
  components: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  consecutive_failures: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  checked_at: {
    type: DataTypes.DATE,

    allowNull: false,
  },
}, {
  tableName: 'health_checks',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Define associations
Healthcheck.associate = function(models) {
  if (Healthcheck._associationsInitialized) return;
  const { Module } = models;

  Healthcheck.belongsTo(Module, { foreignKey: 'module_id', as: 'module', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  // Note: Module.hasMany association is defined in module.js to avoid duplicates
  Healthcheck._associationsInitialized = true;
};

module.exports = Healthcheck;

