const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Eventlog = sequelize.define('Eventlog', {
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
  event_id: {
    type: DataTypes.STRING(255),
    
    unique: true,

    allowNull: false,
  },
  event_type: {
    type: DataTypes.STRING(255),

    allowNull: false,
  },
  event_source: {
    type: DataTypes.STRING(255),

    allowNull: false,
  },
  event_subject: {
    type: DataTypes.STRING(255),

    allowNull: true,
  },
  event_time: {
    type: DataTypes.DATE,

    allowNull: false,
  },
  spec_version: {
    type: DataTypes.STRING(10),

    allowNull: false,
  },
  data_content_type: {
    type: DataTypes.STRING(100),

    allowNull: true,
  },
  data_schema: {
    type: DataTypes.STRING(255),

    allowNull: true,
  },
  data: {
    type: DataTypes.JSONB,

    allowNull: false,
  },
  correlation_id: {
    type: DataTypes.STRING(255),

    allowNull: true,
  },
  causation_id: {
    type: DataTypes.STRING(255),

    allowNull: true,
  },
  kafka_topic: {
    type: DataTypes.STRING(255),

    allowNull: false,
  },
  kafka_partition: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  kafka_offset: {
    type: DataTypes.BIGINT,

    allowNull: true,
  },
  kafka_key: {
    type: DataTypes.STRING(255),

    allowNull: true,
  },
  producer_id: {
    type: DataTypes.STRING(255),

    allowNull: true,
  },
  published_at: {
    type: DataTypes.DATE,

    allowNull: false,
  },
  consumed_at: {
    type: DataTypes.DATE,

    allowNull: true,
  },
  consumer_group: {
    type: DataTypes.STRING(255),

    allowNull: true,
  },
  processing_status: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  retry_count: {
    type: DataTypes.INTEGER,

    allowNull: false,
  },
  error_message: {
    type: DataTypes.TEXT(5000),

    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
}, {
  tableName: 'event_logs',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Define associations
Eventlog.associate = function(models) {
  if (Eventlog._associationsInitialized) return;
  const { Tenant } = models;

  Eventlog.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Eventlog, { foreignKey: 'tenant_id', as: 'eventlogs', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Eventlog._associationsInitialized = true;
};


module.exports = Eventlog;

