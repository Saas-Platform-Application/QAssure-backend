const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Healthhistory = sequelize.define('Healthhistory', {
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
  checked_at: {
    type: DataTypes.DATE,

    allowNull: false,
  },
}, {
  tableName: 'health_history',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Define associations
Healthhistory.associate = function(models) {
  if (Healthhistory._associationsInitialized) return;
  const { Module } = models;

  Healthhistory.belongsTo(Module, { foreignKey: 'module_id', as: 'module', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  // Note: Module.hasMany association is defined in module.js to avoid duplicates
  Healthhistory._associationsInitialized = true;
};

module.exports = Healthhistory;

