const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Tenant = sequelize.define('Tenant', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,

    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(100),

    unique: true,

    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(100),

    unique: true,

    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  settings: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  subscription_tier: {
    type: DataTypes.STRING(50),

    allowNull: true,
  },
  max_users: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  max_modules: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  domain: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  enable_sso: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  enable_2fa: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  logo_file_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  logo_file_attachment_uuid: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  favicon_file_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  favicon_file_attachment_uuid: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  primary_color: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  secondary_color: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  accent_color: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
}, {
  tableName: 'tenants',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Associations derived from migrations
Tenant.associate = (models) => {
  if (Tenant._associationsInitialized) return;
  const { Module, TenantModule, FileAttachment } = models;

  // Many-to-many relationship with modules through tenant_modules
  Tenant.belongsToMany(Module, {
    through: TenantModule,
    foreignKey: 'tenant_id',
    otherKey: 'module_id',
    as: 'assignedModules',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  // logo and favicon associations
  Tenant.belongsTo(FileAttachment, {
    foreignKey: 'logo_file_attachment_uuid',
    as: 'logoAttachment'
  });
  Tenant.belongsTo(FileAttachment, {
    foreignKey: 'favicon_file_attachment_uuid',
    as: 'faviconAttachment'
  });

  // Inverse relations are defined in child models; Tenant side is added there.
  Tenant._associationsInitialized = true;
};

module.exports = Tenant;

