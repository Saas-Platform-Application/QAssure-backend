const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Apikey = sequelize.define('Apikey', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,

    allowNull: false,
  },
  key_hash: {
    type: DataTypes.STRING(255),

    unique: true,

    allowNull: false,
  },
  key_prefix: {
    type: DataTypes.STRING(10),

    allowNull: true,
  },
  name: {
    type: DataTypes.STRING(100),

    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT(500),

    allowNull: true,
  },
  tenant_id: {
    type: DataTypes.UUID,

    allowNull: false,
  },
  module_id: {
    type: DataTypes.UUID,

    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,

    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  rate_limit: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  ip_allowlist: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  last_used_at: {
    type: DataTypes.DATE,

    allowNull: true,
  },
  last_used_ip: {
    type: DataTypes.STRING(45),

    allowNull: true,
  },
  usage_count: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  expires_at: {
    type: DataTypes.DATE,

    allowNull: true,
  },
}, {
  tableName: 'api_keys',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Define associations
Apikey.associate = function(models) {
  if (Apikey._associationsInitialized) return;
  const { Tenant, User, Module } = models;

  Apikey.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Apikey.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  Apikey.belongsTo(Module, { foreignKey: 'module_id', as: 'module', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Apikey, { foreignKey: 'tenant_id', as: 'apikeys', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Apikey, { foreignKey: 'created_by', as: 'apikeys', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  // Note: Module.hasMany association is defined in module.js to avoid duplicates
  Apikey._associationsInitialized = true;
};

module.exports = Apikey;

