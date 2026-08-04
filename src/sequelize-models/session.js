const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Session = sequelize.define('Session', {
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

    allowNull: true,
  },
  token_hash: {
    type: DataTypes.STRING(255),
    
    unique: true,

    allowNull: false,
  },
  refresh_token_hash: {
    type: DataTypes.STRING(255),
    
    unique: true,

    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING(45),

    allowNull: true,
  },
  user_agent: {
    type: DataTypes.TEXT(500),

    allowNull: true,
  },
  expires_at: {
    type: DataTypes.DATE,

    allowNull: false,
  },
  refresh_expires_at: {
    type: DataTypes.DATE,

    allowNull: true,
  },
  revoked_at: {
    type: DataTypes.DATE,

    allowNull: true,
  },
}, {
  tableName: 'sessions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Associations derived from migrations
Session.associate = (models) => {
  if (Session._associationsInitialized) return;
  Session.belongsTo(models.User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Session.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  models.User.hasMany(Session, { foreignKey: 'user_id', as: 'sessions' });
  models.Tenant.hasMany(Session, { foreignKey: 'tenant_id', as: 'sessions' });
  Session._associationsInitialized = true;
};

// Define associations
Session.associate = function(models) {
  if (Session._associationsInitialized) return;
  const { User, Tenant } = models;

  Session.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Session.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Session, { foreignKey: 'user_id', as: 'sessions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Session, { foreignKey: 'tenant_id', as: 'sessions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Session._associationsInitialized = true;
};


module.exports = Session;

