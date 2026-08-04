const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Usertenant = sequelize.define('Usertenant', {
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
  tenant_id: {
    type: DataTypes.UUID,

    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  is_primary: {
    type: DataTypes.BOOLEAN,

    allowNull: true,
  },
  joined_at: {
    type: DataTypes.DATE,

    allowNull: false,
  },
}, {
  tableName: 'user_tenants',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Associations derived from migrations
Usertenant.associate = (models) => {
  if (Usertenant._associationsInitialized) return;
  Usertenant.belongsTo(models.User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Usertenant.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  models.User.hasMany(Usertenant, { foreignKey: 'user_id', as: 'userTenants' });
  models.Tenant.hasMany(Usertenant, { foreignKey: 'tenant_id', as: 'userTenants' });
  Usertenant._associationsInitialized = true;
};

// Define associations
Usertenant.associate = function(models) {
  if (Usertenant._associationsInitialized) return;
  const { User, Tenant } = models;

  Usertenant.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Usertenant.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Usertenant, { foreignKey: 'user_id', as: 'usertenants', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Usertenant, { foreignKey: 'tenant_id', as: 'usertenants', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Usertenant._associationsInitialized = true;
};


module.exports = Usertenant;

