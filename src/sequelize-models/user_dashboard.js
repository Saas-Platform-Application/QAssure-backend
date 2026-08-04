const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserDashboard = sequelize.define('UserDashboard', {
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
  name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: 'My Dashboard',
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  widgets: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  refresh_interval: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 300,
  },
  layout_config: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
}, {
  tableName: 'user_dashboards',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
UserDashboard.associate = function(models) {
  if (UserDashboard._associationsInitialized) return;
  const { User, Tenant } = models;

  UserDashboard.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  UserDashboard.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(UserDashboard, { foreignKey: 'user_id', as: 'userdashboards', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(UserDashboard, { foreignKey: 'tenant_id', as: 'userdashboards', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  UserDashboard._associationsInitialized = true;
};


module.exports = UserDashboard;

