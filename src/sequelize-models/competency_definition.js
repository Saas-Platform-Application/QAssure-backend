const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CompetencyDefinition = sequelize.define('CompetencyDefinition', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  levels: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  role_requirements: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'competency_definitions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
CompetencyDefinition.associate = function(models) {
  if (CompetencyDefinition._associationsInitialized) return;
  const { Tenant } = models;

  CompetencyDefinition.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(CompetencyDefinition, { foreignKey: 'tenant_id', as: 'competencydefinitions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  CompetencyDefinition._associationsInitialized = true;
};


module.exports = CompetencyDefinition;

