const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Qmsconnection = sequelize.define('Qmsconnection', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,

    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,

    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(100),

    allowNull: false,
  },
  qms_type: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  base_url: {
    type: DataTypes.STRING(255),

    allowNull: false,
  },
  auth_type: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  auth_config: {
    type: DataTypes.JSONB,

    allowNull: false,
  },
  sync_mode: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  entity_mappings: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  field_mappings: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  webhook_url: {
    type: DataTypes.STRING(255),

    allowNull: true,
  },
  webhook_secret: {
    type: DataTypes.STRING(255),

    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  last_sync_at: {
    type: DataTypes.DATE,

    allowNull: true,
  },
  last_error: {
    type: DataTypes.TEXT(1000),

    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,

    allowNull: false,
  },
}, {
  tableName: 'qms_connections',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Define associations
Qmsconnection.associate = function(models) {
  if (Qmsconnection._associationsInitialized) return;
  const { Tenant, User } = models;

  Qmsconnection.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Qmsconnection.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  Qmsconnection.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedby', onDelete: 'SET', onUpdate: 'CASCADE' });
  Tenant.hasMany(Qmsconnection, { foreignKey: 'tenant_id', as: 'tenantQmsconnections', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Qmsconnection, { foreignKey: 'tenant_id', as: 'qmsconnections', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Qmsconnection, { foreignKey: 'created_by', as: 'qmsconnections', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  User.hasMany(Qmsconnection, { foreignKey: 'created_by', as: 'createdQmsconnections', onDelete: 'SET', onUpdate: 'CASCADE' });
  User.hasMany(Qmsconnection, { foreignKey: 'updated_by', as: 'updatedQmsconnections', onDelete: 'SET', onUpdate: 'CASCADE' });
  Qmsconnection._associationsInitialized = true;
};

module.exports = Qmsconnection;

