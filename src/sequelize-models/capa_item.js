const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CapaItem = sequelize.define('CapaItem', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  capa_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  item_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  assigned_to: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'pending',
  },
  sequence: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'capa_items',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
CapaItem.associate = function(models) {
  if (CapaItem._associationsInitialized) return;
  const { Capa, Tenant, User } = models;
  
  CapaItem.belongsTo(Capa, { foreignKey: 'capa_id', as: 'capa', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  CapaItem.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  CapaItem.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedTo', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Capa.hasMany(CapaItem, { foreignKey: 'capa_id', as: 'items', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(CapaItem, { foreignKey: 'tenant_id', as: 'capaItems', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  CapaItem._associationsInitialized = true;
};

module.exports = CapaItem;

