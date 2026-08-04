const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Userrole = sequelize.define('Userrole', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,

    allowNull: false,
  },
  user_id: {
    type: DataTypes.UUID,

    allowNull: false,
  },
  role_id: {
    type: DataTypes.UUID,

    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,

    allowNull: true,
  },
  module_id: {
    type: DataTypes.UUID,

    allowNull: true,
  },
  assigned_by: {
    type: DataTypes.UUID,

    allowNull: true,
  },
  assigned_at: {
    type: DataTypes.DATE,

    allowNull: false,
  },
  expires_at: {
    type: DataTypes.DATE,

    allowNull: true,
  },
}, {
  tableName: 'user_roles',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Associations derived from migrations
Userrole.associate = (models) => {
  if (Userrole._associationsInitialized) return;
  Userrole.belongsTo(models.User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Userrole.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Userrole.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Userrole.belongsTo(models.Module, { foreignKey: 'module_id', as: 'module', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Userrole.belongsTo(models.User, { foreignKey: 'assigned_by', as: 'assignedBy', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  models.User.belongsToMany(models.Role, { through: Userrole, foreignKey: 'user_id', otherKey: 'role_id', as: 'roles' });
  models.Role.belongsToMany(models.User, { through: Userrole, foreignKey: 'role_id', otherKey: 'user_id', as: 'users' });
  Userrole._associationsInitialized = true;
};

// Define associations
Userrole.associate = function(models) {
  if (Userrole._associationsInitialized) return;
  const { User, Role, Tenant, Module } = models;

  Userrole.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Userrole.belongsTo(Role, { foreignKey: 'role_id', as: 'role', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Userrole.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Userrole.belongsTo(Module, { foreignKey: 'module_id', as: 'module', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Userrole.belongsTo(User, { foreignKey: 'assigned_by', as: 'assignedby', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  User.hasMany(Userrole, { foreignKey: 'user_id', as: 'userroles', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Userrole, { foreignKey: 'assigned_by', as: 'assignedUserroles', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Role.hasMany(Userrole, { foreignKey: 'role_id', as: 'userroles', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Userrole, { foreignKey: 'tenant_id', as: 'userroles', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Module.hasMany(Userrole, { foreignKey: 'module_id', as: 'userroles', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Userrole._associationsInitialized = true;
};


module.exports = Userrole;

