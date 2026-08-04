const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PasswordHistory = sequelize.define('PasswordHistory', {
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
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  changed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  change_reason: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  changed_from_ip: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'password_history',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
PasswordHistory.associate = function(models) {
  if (PasswordHistory._associationsInitialized) return;
  const { User, Tenant } = models;

  PasswordHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  PasswordHistory.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(PasswordHistory, { foreignKey: 'user_id', as: 'passwordhistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(PasswordHistory, { foreignKey: 'tenant_id', as: 'passwordhistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  PasswordHistory._associationsInitialized = true;
};


module.exports = PasswordHistory;

