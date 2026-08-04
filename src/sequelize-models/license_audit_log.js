const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LicenseAuditLog = sequelize.define('LicenseAuditLog', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  license_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  event_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  event_description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  previous_state: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  new_state: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  previous_hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  event_hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  performed_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  performed_by_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  performed_by_role: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
}, {
  tableName: 'license_audit_log',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
LicenseAuditLog.associate = function(models) {
  if (LicenseAuditLog._associationsInitialized) return;
  const { License, Tenant, User } = models;
  
  LicenseAuditLog.belongsTo(License, { foreignKey: 'license_id', as: 'license', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  LicenseAuditLog.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  LicenseAuditLog.belongsTo(User, { foreignKey: 'performed_by', as: 'performedBy', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  License.hasMany(LicenseAuditLog, { foreignKey: 'license_id', as: 'auditLogs', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  LicenseAuditLog._associationsInitialized = true;
};

module.exports = LicenseAuditLog;

