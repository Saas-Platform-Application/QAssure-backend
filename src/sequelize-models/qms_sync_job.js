const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Qmssyncjob = sequelize.define('Qmssyncjob', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,

    allowNull: false,
  },
  connection_id: {
    type: DataTypes.UUID,

    allowNull: false,
  },
  job_type: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  direction: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  entity_type: {
    type: DataTypes.STRING(100),

    allowNull: true,
  },
  records_total: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  records_processed: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  records_created: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  records_updated: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  records_failed: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  conflicts_detected: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  conflicts_resolved: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  error_message: {
    type: DataTypes.TEXT(2000),

    allowNull: true,
  },
  error_details: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  started_at: {
    type: DataTypes.DATE,

    allowNull: true,
  },
  completed_at: {
    type: DataTypes.DATE,

    allowNull: true,
  },
  triggered_by: {
    type: DataTypes.UUID,

    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
}, {
  tableName: 'qms_sync_jobs',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Define associations
Qmssyncjob.associate = function(models) {
  if (Qmssyncjob._associationsInitialized) return;
  const { Qmsconnection, User, Tenant } = models;

  Qmssyncjob.belongsTo(Qmsconnection, { foreignKey: 'connection_id', as: 'connection', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Qmssyncjob.belongsTo(User, { foreignKey: 'triggered_by', as: 'triggeredby', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Qmssyncjob.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Qmssyncjob.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'SET', onUpdate: 'CASCADE' });
  Qmsconnection.hasMany(Qmssyncjob, { foreignKey: 'connection_id', as: 'connectionQmssyncjobs', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Qmsconnection.hasMany(Qmssyncjob, { foreignKey: 'connection_id', as: 'qmssyncjobs', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Qmssyncjob, { foreignKey: 'triggered_by', as: 'qmssyncjobs', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  User.hasMany(Qmssyncjob, { foreignKey: 'created_by', as: 'createdQmssyncjobs', onDelete: 'SET', onUpdate: 'CASCADE' });
  Tenant.hasMany(Qmssyncjob, { foreignKey: 'tenant_id', as: 'qmssyncjobs', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Qmssyncjob._associationsInitialized = true;
};

module.exports = Qmssyncjob;

