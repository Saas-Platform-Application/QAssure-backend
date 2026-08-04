const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AccessReview = sequelize.define('AccessReview', {
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
  review_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'periodic',
  },
  scope_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'all_users',
  },
  scope_criteria: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  frequency: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  reviewer_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  reviewer_role: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'pending',
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completed_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  total_users: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  certified_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  revoked_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  pending_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  auto_revoke_on_overdue: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  auto_revoke_after_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'access_reviews',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
AccessReview.associate = function(models) {
  if (AccessReview._associationsInitialized) return;
  const { Tenant, User } = models;

  AccessReview.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AccessReview.belongsTo(User, { foreignKey: 'reviewer_id', as: 'reviewer', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AccessReview.belongsTo(User, { foreignKey: 'completed_by', as: 'completedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AccessReview.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(AccessReview, { foreignKey: 'tenant_id', as: 'accessreviews', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(AccessReview, { foreignKey: 'reviewer_id', as: 'reviewedAccessReviews', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(AccessReview, { foreignKey: 'completed_by', as: 'completedAccessReviews', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(AccessReview, { foreignKey: 'created_by', as: 'createdAccessReviews', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AccessReview._associationsInitialized = true;
};


module.exports = AccessReview;

