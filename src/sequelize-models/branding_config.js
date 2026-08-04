const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BrandingConfig = sequelize.define('BrandingConfig', {
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
    unique: true,
  },
  logo_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  logo_dark_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  favicon_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  login_background_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  primary_color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '#1976d2',
  },
  secondary_color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '#dc004e',
  },
  accent_color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '#ff9800',
  },
  background_color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '#ffffff',
  },
  text_color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '#333333',
  },
  font_family: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Inter, sans-serif',
  },
  heading_font_family: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  custom_css: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  footer_text: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  copyright_text: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  privacy_policy_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  terms_of_service_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  email_header_html: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  email_footer_html: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'branding_config',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,
});

// Define associations
BrandingConfig.associate = function(models) {
  if (BrandingConfig._associationsInitialized) return;
  const { Tenant } = models;

  BrandingConfig.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Tenant.hasMany(BrandingConfig, { foreignKey: 'tenant_id', as: 'brandingconfig', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  BrandingConfig._associationsInitialized = true;
};


module.exports = BrandingConfig;

