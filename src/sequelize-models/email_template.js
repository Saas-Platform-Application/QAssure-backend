const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmailTemplate = sequelize.define('EmailTemplate', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  template_code: {
    type: DataTypes.STRING(100),
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
  subject_template: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  body_html: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  body_text: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  variables: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'email_templates',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
EmailTemplate.associate = function(models) {
  if (EmailTemplate._associationsInitialized) return;
  const { Tenant, User } = models;

  EmailTemplate.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  EmailTemplate.belongsTo(User, { foreignKey: 'created_by', as: 'createdby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  EmailTemplate.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedby', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(EmailTemplate, { foreignKey: 'tenant_id', as: 'emailtemplates', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(EmailTemplate, { foreignKey: 'created_by', as: 'emailtemplates', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(EmailTemplate, { foreignKey: 'updated_by', as: 'updatedEmailtemplates', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  EmailTemplate._associationsInitialized = true;
};


module.exports = EmailTemplate;

