const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Permission = sequelize.define('Permission', {
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
  resource: {
    type: DataTypes.STRING(100),

    allowNull: false,
  },
  action: {
    type: DataTypes.STRING(50),

    allowNull: false,
  },
  scope: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  conditions: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
}, {
  tableName: 'permissions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Associations derived from migrations
Permission.associate = (models) => {
  if (Permission._associationsInitialized) return;
  Permission.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  models.Role.hasMany(Permission, { foreignKey: 'role_id', as: 'permissions' });
  Permission._associationsInitialized = true;
};

// Define associations
Permission.associate = function(models) {
  if (Permission._associationsInitialized) return;
  const { Role } = models;

  Permission.belongsTo(Role, { foreignKey: 'role_id', as: 'role', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Role.hasMany(Permission, { foreignKey: 'role_id', as: 'permissions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Permission._associationsInitialized = true;
};


module.exports = Permission;

