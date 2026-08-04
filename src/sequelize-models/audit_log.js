const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Auditlog = sequelize.define('Auditlog', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,

    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,

    allowNull: true,
  },
  user_id: {
    type: DataTypes.UUID,

    allowNull: true,
  },
  action: {
    type: DataTypes.STRING(100),

    allowNull: false,
  },
  resource_type: {
    type: DataTypes.STRING(100),

    allowNull: false,
  },
  resource_id: {
    type: DataTypes.STRING(255),

    allowNull: true,
  },
  request_method: {
    type: DataTypes.STRING(10),

    allowNull: true,
  },
  request_path: {
    type: DataTypes.STRING(500),

    allowNull: true,
  },
  request_body: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  response_status: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  response_body: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING(45),

    allowNull: true,
  },
  user_agent: {
    type: DataTypes.TEXT(500),

    allowNull: true,
  },
  correlation_id: {
    type: DataTypes.STRING(100),

    allowNull: true,
  },
  changes: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  module_id: {
    type: DataTypes.UUID,

    allowNull: true,
  },
}, {
  tableName: 'audit_logs',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Define associations
Auditlog.associate = function(models) {
  if (Auditlog._associationsInitialized) return;
  const { User, Tenant, Module } = models;

  Auditlog.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Auditlog.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Auditlog.belongsTo(Module, { foreignKey: 'module_id', as: 'module', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  
  User.hasMany(Auditlog, { foreignKey: 'user_id', as: 'auditlogs', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Tenant.hasMany(Auditlog, { foreignKey: 'tenant_id', as: 'auditlogs', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Auditlog._associationsInitialized = true;
};


module.exports = Auditlog;

