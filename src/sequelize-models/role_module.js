const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RoleModule = sequelize.define('RoleModule', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
  },
  role_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  module_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'role_modules',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Associations
RoleModule.associate = (models) => {
  if (RoleModule._associationsInitialized) return;
  const { Role, Module } = models;

  RoleModule.belongsTo(Role, { foreignKey: 'role_id', as: 'role', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  RoleModule.belongsTo(Module, { foreignKey: 'module_id', as: 'module', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  
  RoleModule._associationsInitialized = true;
};

module.exports = RoleModule;
