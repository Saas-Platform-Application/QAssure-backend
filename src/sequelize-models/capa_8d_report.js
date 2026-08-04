const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Capa8dReport = sequelize.define('Capa8dReport', {
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
    unique: true,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  d1_team: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  d1_completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  d2_problem_description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d2_who: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d2_what: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d2_when: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d2_where: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d2_why: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d2_how: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d2_how_many: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d2_completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  d3_containment_actions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d3_verification: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d3_completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  d4_root_causes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d4_escape_point: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d4_analysis_method: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  d4_completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  d5_corrective_actions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d5_verification_plan: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d5_completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  d6_implementation_plan: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d6_validation_results: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d6_completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  d7_preventive_actions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d7_systemic_changes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d7_completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  d8_lessons_learned: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d8_recognition: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  d8_closed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'capa_8d_reports',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
Capa8dReport.associate = function(models) {
  if (Capa8dReport._associationsInitialized) return;
  const { Capa, Tenant } = models;

  Capa8dReport.belongsTo(Capa, { foreignKey: 'capa_id', as: 'capa', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Capa8dReport.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Capa.hasMany(Capa8dReport, { foreignKey: 'capa_id', as: 'capa8dreports', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(Capa8dReport, { foreignKey: 'tenant_id', as: 'capa8dreports', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Capa8dReport._associationsInitialized = true;
};


module.exports = Capa8dReport;

