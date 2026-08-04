const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CapaAction = sequelize.define('CapaAction', {
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
  action_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  action_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  assigned_to: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  completed_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'pending',
  },
  evidence: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  attachments: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  verified_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  verification_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'capa_actions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
CapaAction.associate = function(models) {
  if (CapaAction._associationsInitialized) return;
  const { Capa, Tenant, User } = models;

  CapaAction.belongsTo(Capa, { foreignKey: 'capa_id', as: 'capa', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  CapaAction.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  CapaAction.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedto', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  CapaAction.belongsTo(User, { foreignKey: 'verified_by', as: 'verifiedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Capa.hasMany(CapaAction, { foreignKey: 'capa_id', as: 'capaactions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(CapaAction, { foreignKey: 'tenant_id', as: 'tenantCapaActions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(CapaAction, { foreignKey: 'assigned_to', as: 'assignedCapaActions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(CapaAction, { foreignKey: 'verified_by', as: 'verifiedCapaActions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  CapaAction._associationsInitialized = true;
};


module.exports = CapaAction;

