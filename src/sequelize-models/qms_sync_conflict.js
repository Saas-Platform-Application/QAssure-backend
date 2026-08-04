const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Qmssyncconflict = sequelize.define('Qmssyncconflict', {
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
  sync_job_id: {
    type: DataTypes.UUID,

    allowNull: false,
  },
  qms_connection_id: {
    type: DataTypes.UUID,

    allowNull: false,
  },
  entity_type: {
    type: DataTypes.STRING(100),

    allowNull: false,
  },
  entity_id: {
    type: DataTypes.STRING(255),

    allowNull: false,
  },
  qms_record_id: {
    type: DataTypes.STRING(255),

    allowNull: false,
  },
  qassure_record_id: {
    type: DataTypes.STRING(255),

    allowNull: true,
  },
  conflict_type: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  conflict_field: {
    type: DataTypes.STRING(255),

    allowNull: true,
  },
  qms_value: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  qassure_value: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  conflict_details: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  resolution_strategy: {
    type: DataTypes.STRING,

    allowNull: true,
  },
  resolved_value: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  resolved_by: {
    type: DataTypes.UUID,

    allowNull: true,
  },
  resolved_at: {
    type: DataTypes.DATE,

    allowNull: true,
  },
  resolution_notes: {
    type: DataTypes.TEXT(10000),

    allowNull: true,
  },
  retry_count: {
    type: DataTypes.INTEGER,

    allowNull: false,
  },
  last_retry_at: {
    type: DataTypes.DATE,

    allowNull: true,
  },
  error_message: {
    type: DataTypes.TEXT(5000),

    allowNull: true,
  },
}, {
  tableName: 'qms_sync_conflicts',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Define associations
Qmssyncconflict.associate = function(models) {
  if (Qmssyncconflict._associationsInitialized) return;
  const { Tenant, Qmssyncjob, Qmsconnection, User } = models;

  Qmssyncconflict.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Qmssyncconflict.belongsTo(Qmssyncjob, { foreignKey: 'sync_job_id', as: 'syncjob', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Qmssyncconflict.belongsTo(Qmsconnection, { foreignKey: 'qms_connection_id', as: 'qmsconnection', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Qmssyncconflict.belongsTo(User, { foreignKey: 'resolved_by', as: 'resolvedby', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Qmssyncconflict.belongsTo(Qmsconnection, { foreignKey: 'connection_id', as: 'qmsConnection', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Qmssyncconflict, { foreignKey: 'tenant_id', as: 'tenantQmssyncconflicts', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Qmssyncconflict, { foreignKey: 'tenant_id', as: 'qmssyncconflicts', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Qmssyncjob.hasMany(Qmssyncconflict, { foreignKey: 'sync_job_id', as: 'qmssyncconflicts', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Qmsconnection.hasMany(Qmssyncconflict, { foreignKey: 'qms_connection_id', as: 'qmssyncconflicts', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Qmsconnection.hasMany(Qmssyncconflict, { foreignKey: 'connection_id', as: 'connectionQmssyncconflicts', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Qmssyncconflict, { foreignKey: 'resolved_by', as: 'qmssyncconflicts', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  User.hasMany(Qmssyncconflict, { foreignKey: 'resolved_by', as: 'resolvedQmssyncconflicts', onDelete: 'SET', onUpdate: 'CASCADE' });
  Qmssyncconflict._associationsInitialized = true;
};

module.exports = Qmssyncconflict;

