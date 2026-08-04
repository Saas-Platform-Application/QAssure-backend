const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemSetting = sequelize.define('SystemSetting', {
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
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  setting_key: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  setting_value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  value_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'string',
  },
  display_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_sensitive: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  is_readonly: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  validation_rules: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  default_value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'system_settings',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
SystemSetting.associate = function(models) {
  if (SystemSetting._associationsInitialized) return;
  const { Tenant, User } = models;

  SystemSetting.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SystemSetting.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(SystemSetting, { foreignKey: 'tenant_id', as: 'systemsettings', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(SystemSetting, { foreignKey: 'updated_by', as: 'systemsettings', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SystemSetting._associationsInitialized = true;
};


module.exports = SystemSetting;

