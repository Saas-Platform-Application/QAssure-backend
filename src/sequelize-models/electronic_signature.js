const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ElectronicSignature = sequelize.define('ElectronicSignature', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  resource_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  resource_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  resource_name: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  meaning: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  auth_method: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'password_pin',
  },
  signature_hash: {
    type: DataTypes.STRING(512),
    allowNull: false,
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  device_info: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  location: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  signed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  signature_order: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  required_signatures: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  workflow_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  is_valid: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  invalidated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  invalidated_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  invalidation_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'electronic_signatures',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
ElectronicSignature.associate = function(models) {
  if (ElectronicSignature._associationsInitialized) return;
  const { User, Tenant } = models;

  ElectronicSignature.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ElectronicSignature.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ElectronicSignature.belongsTo(User, { foreignKey: 'invalidated_by', as: 'invalidatedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(ElectronicSignature, { foreignKey: 'user_id', as: 'electronicsignatures', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(ElectronicSignature, { foreignKey: 'invalidated_by', as: 'invalidatedElectronicsignatures', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(ElectronicSignature, { foreignKey: 'tenant_id', as: 'electronicsignatures', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  ElectronicSignature._associationsInitialized = true;
};


module.exports = ElectronicSignature;

