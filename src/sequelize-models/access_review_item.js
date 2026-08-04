const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AccessReviewItem = sequelize.define('AccessReviewItem', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  review_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  user_email: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  user_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  current_roles: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  current_permissions: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  decision: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  decision_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  new_roles: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  decided_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  decided_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  executed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  executed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  execution_error: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'access_review_items',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: false,
});

// Define associations
AccessReviewItem.associate = function(models) {
  if (AccessReviewItem._associationsInitialized) return;
  const { AccessReview, Tenant, User } = models;

  AccessReviewItem.belongsTo(AccessReview, { foreignKey: 'review_id', as: 'review', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AccessReviewItem.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AccessReviewItem.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AccessReviewItem.belongsTo(User, { foreignKey: 'decided_by', as: 'decidedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AccessReview.hasMany(AccessReviewItem, { foreignKey: 'review_id', as: 'accessreviewitems', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(AccessReviewItem, { foreignKey: 'tenant_id', as: 'tenantAccessReviewItems', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(AccessReviewItem, { foreignKey: 'user_id', as: 'userAccessReviewItems', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(AccessReviewItem, { foreignKey: 'decided_by', as: 'decidedAccessReviewItems', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  AccessReviewItem._associationsInitialized = true;
};


module.exports = AccessReviewItem;

