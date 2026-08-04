const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditFinding = sequelize.define('AuditFinding', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  audit_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  finding_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  finding_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  clause_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  evidence: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  supplier_response: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  response_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  verification_method: {
    type: DataTypes.TEXT,
    allowNull: true,
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
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'open',
  },
  capa_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'audit_findings',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
AuditFinding.associate = function(models) {
  if (AuditFinding._associationsInitialized) return;
  const { SupplierAudit, Tenant, User, Capa } = models;

  AuditFinding.belongsTo(SupplierAudit, { foreignKey: 'audit_id', as: 'audit', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AuditFinding.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AuditFinding.belongsTo(User, { foreignKey: 'verified_by', as: 'verifiedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AuditFinding.belongsTo(Capa, { foreignKey: 'capa_id', as: 'capa', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierAudit.hasMany(AuditFinding, { foreignKey: 'audit_id', as: 'auditfindings', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(AuditFinding, { foreignKey: 'tenant_id', as: 'auditfindings', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(AuditFinding, { foreignKey: 'verified_by', as: 'auditfindings', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Capa.hasMany(AuditFinding, { foreignKey: 'capa_id', as: 'auditfindings', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AuditFinding._associationsInitialized = true;
};


module.exports = AuditFinding;

