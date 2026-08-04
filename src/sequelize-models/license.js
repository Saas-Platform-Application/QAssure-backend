const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const License = sequelize.define('License', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  license_key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  license_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  tier: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  application: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'pending',
  },
  activation_state: {
    type: DataTypes.STRING(30),
    allowNull: true,
    defaultValue: 'not_activated',
  },
  issued_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  activated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  starts_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  grace_period_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 30,
  },
  grace_ends_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  max_users: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  max_projects: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  max_ai_tokens: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  max_storage_gb: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  features: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'licenses',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
License.associate = function(models) {
  if (License._associationsInitialized) return;
  const { Tenant, User } = models;

  License.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  License.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  License.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  License.belongsTo(User, { foreignKey: 'revoked_by', as: 'revokedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(License, { foreignKey: 'tenant_id', as: 'licenses', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(License, { foreignKey: 'created_by', as: 'licenses', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(License, { foreignKey: 'updated_by', as: 'updatedLicenses', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(License, { foreignKey: 'revoked_by', as: 'revokedLicenses', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  License._associationsInitialized = true;
};


module.exports = License;

