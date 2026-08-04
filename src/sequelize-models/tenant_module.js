const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TenantModule = sequelize.define('TenantModule', {
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
  module_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  assigned_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  assigned_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'active'
  },
}, {
  tableName: 'tenant_modules',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Associations
TenantModule.associate = (models) => {
  if (TenantModule._associationsInitialized) return;
  const { Tenant, Module, User } = models;

  TenantModule.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TenantModule.belongsTo(Module, { foreignKey: 'module_id', as: 'module', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  TenantModule.belongsTo(User, { foreignKey: 'assigned_by', as: 'assignedBy', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  
  TenantModule._associationsInitialized = true;
};

module.exports = TenantModule;
