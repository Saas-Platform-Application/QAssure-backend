const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Qmsentitymapping = sequelize.define('Qmsentitymapping', {
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
  qms_connection_id: {
    type: DataTypes.UUID,

    allowNull: false,
  },
  qms_entity_type: {
    type: DataTypes.STRING(100),

    allowNull: false,
  },
  qassure_entity_type: {
    type: DataTypes.STRING(100),

    allowNull: false,
  },
  mapping_direction: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  field_mappings: {
    type: DataTypes.JSONB,

    allowNull: false,
  },
  transformation_rules: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  validation_rules: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  conflict_resolution_strategy: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  sync_enabled: {
    type: DataTypes.BOOLEAN,

    allowNull: false,
  },
  sync_frequency: {
    type: DataTypes.STRING,

    allowNull: true,
  },
  filter_criteria: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  last_sync_at: {
    type: DataTypes.DATE,

    allowNull: true,
  },
  records_synced: {
    type: DataTypes.BIGINT,

    allowNull: false,
  },
  created_by: {
    type: DataTypes.UUID,

    allowNull: false,
  },
  updated_by: {
    type: DataTypes.UUID,

    allowNull: true,
  },
}, {
  tableName: 'qms_entity_mappings',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Define associations
Qmsentitymapping.associate = function(models) {
  if (Qmsentitymapping._associationsInitialized) return;
  const { Tenant, Qmsconnection, User } = models;

  Qmsentitymapping.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Qmsentitymapping.belongsTo(Qmsconnection, { foreignKey: 'qms_connection_id', as: 'qmsconnection', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Qmsentitymapping.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  Qmsentitymapping.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedby', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Qmsentitymapping.belongsTo(Qmsconnection, { foreignKey: 'connection_id', as: 'connection', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Qmsentitymapping, { foreignKey: 'tenant_id', as: 'tenantQmsentitymappings', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Qmsentitymapping, { foreignKey: 'tenant_id', as: 'qmsentitymappings', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Qmsconnection.hasMany(Qmsentitymapping, { foreignKey: 'qms_connection_id', as: 'qmsentitymappings', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Qmsconnection.hasMany(Qmsentitymapping, { foreignKey: 'connection_id', as: 'connectionQmsentitymappings', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Qmsentitymapping, { foreignKey: 'created_by', as: 'qmsentitymappings', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  User.hasMany(Qmsentitymapping, { foreignKey: 'updated_by', as: 'updatedQmsentitymappings', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  User.hasMany(Qmsentitymapping, { foreignKey: 'created_by', as: 'createdQmsentitymappings', onDelete: 'SET', onUpdate: 'CASCADE' });
  Qmsentitymapping._associationsInitialized = true;
};

module.exports = Qmsentitymapping;

