const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Apikeypermission = sequelize.define('Apikeypermission', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,

    allowNull: false,
  },
  api_key_id: {
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
}, {
  tableName: 'api_key_permissions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Define associations
Apikeypermission.associate = function(models) {
  if (Apikeypermission._associationsInitialized) return;
  const { Apikey } = models;

  Apikeypermission.belongsTo(Apikey, { foreignKey: 'api_key_id', as: 'apikey', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Apikey.hasMany(Apikeypermission, { foreignKey: 'api_key_id', as: 'apikeypermissions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Apikeypermission._associationsInitialized = true;
};

module.exports = Apikeypermission;

