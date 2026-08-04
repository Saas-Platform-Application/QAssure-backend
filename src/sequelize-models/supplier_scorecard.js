const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupplierScorecard = sequelize.define('SupplierScorecard', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  supplier_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  period_start: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  period_end: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  quality_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  defect_rate: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
  },
  lot_acceptance_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  complaints_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  delivery_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  on_time_delivery_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  lead_time_adherence: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  service_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  responsiveness_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  documentation_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  cost_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  price_competitiveness: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  overall_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  grade: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  trend: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  calculated_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  calculated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'supplier_scorecards',
  underscored: true,
  timestamps: false,
  paranoid: false,
});

// Define associations
SupplierScorecard.associate = function(models) {
  if (SupplierScorecard._associationsInitialized) return;
  const { Supplier, Tenant, User } = models;

  SupplierScorecard.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierScorecard.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierScorecard.belongsTo(User, { foreignKey: 'calculated_by', as: 'calculatedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Supplier.hasMany(SupplierScorecard, { foreignKey: 'supplier_id', as: 'supplierscorecards', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(SupplierScorecard, { foreignKey: 'tenant_id', as: 'supplierscorecards', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(SupplierScorecard, { foreignKey: 'calculated_by', as: 'supplierscorecards', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  SupplierScorecard._associationsInitialized = true;
};


module.exports = SupplierScorecard;

