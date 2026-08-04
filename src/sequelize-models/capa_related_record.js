const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CapaRelatedRecord = sequelize.define('CapaRelatedRecord', {
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
  related_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  related_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  related_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  relationship: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'capa_related_records',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
CapaRelatedRecord.associate = function(models) {
  if (CapaRelatedRecord._associationsInitialized) return;
  const { Capa, Tenant, User } = models;

  CapaRelatedRecord.belongsTo(Capa, { foreignKey: 'capa_id', as: 'capa', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  CapaRelatedRecord.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  CapaRelatedRecord.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Capa.hasMany(CapaRelatedRecord, { foreignKey: 'capa_id', as: 'caparelatedrecords', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(CapaRelatedRecord, { foreignKey: 'tenant_id', as: 'caparelatedrecords', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(CapaRelatedRecord, { foreignKey: 'created_by', as: 'caparelatedrecords', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  CapaRelatedRecord._associationsInitialized = true;
};


module.exports = CapaRelatedRecord;

