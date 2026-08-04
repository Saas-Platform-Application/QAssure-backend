const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FeatureFlag = sequelize.define('FeatureFlag', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  flag_key: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  flag_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  rollout_percentage: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 100,
  },
  rollout_strategy: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'all',
  },
  rollout_config: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  enabled_from: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  enabled_until: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'feature_flags',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
FeatureFlag.associate = function(models) {
  if (FeatureFlag._associationsInitialized) return;
  const { Tenant, User } = models;

  FeatureFlag.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  FeatureFlag.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  FeatureFlag.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(FeatureFlag, { foreignKey: 'tenant_id', as: 'featureflags', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(FeatureFlag, { foreignKey: 'created_by', as: 'featureflags', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(FeatureFlag, { foreignKey: 'updated_by', as: 'updatedFeatureflags', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  FeatureFlag._associationsInitialized = true;
};


module.exports = FeatureFlag;

