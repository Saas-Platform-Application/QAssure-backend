const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Module = sequelize.define('Module', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true,

    allowNull: false,
  },
  module_id: {
    type: DataTypes.STRING(100),
    
    unique: true,

    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(100),

    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT(1000),

    allowNull: true,
  },
  version: {
    type: DataTypes.STRING(20),

    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,

    allowNull: false,
  },
  runtime_language: {
    type: DataTypes.STRING(50),

    allowNull: false,
  },
  framework: {
    type: DataTypes.STRING(50),

    allowNull: true,
  },
  frontend_base_url: {
    type: DataTypes.STRING(255),

    allowNull: false,
  },
  backend_base_url: {
    type: DataTypes.STRING(255),

    allowNull: false,
  },
  health_endpoint: {
    type: DataTypes.STRING(255),

    allowNull: false,
  },
  webhookurl: {
    type: DataTypes.STRING(500),

    allowNull: true,
  },
  sync_webhook_url: {
    type: DataTypes.STRING(500),

    allowNull: true,
  },
  endpoints: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  kafka_topics: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
  cpu_request: {
    type: DataTypes.STRING(20),

    allowNull: true,
  },
  cpu_limit: {
    type: DataTypes.STRING(20),

    allowNull: true,
  },
  memory_request: {
    type: DataTypes.STRING(20),

    allowNull: true,
  },
  memory_limit: {
    type: DataTypes.STRING(20),

    allowNull: true,
  },
  min_replicas: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  max_replicas: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  last_health_check: {
    type: DataTypes.DATE,

    allowNull: true,
  },
  health_status: {
    type: DataTypes.STRING(20),

    allowNull: true,
  },
  consecutive_failures: {
    type: DataTypes.INTEGER,

    allowNull: true,
  },
  registered_by: {
    type: DataTypes.UUID,

    allowNull: false,
  },
  tenant_id: {
    type: DataTypes.UUID,

    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,

    allowNull: true,
  },
}, {
  tableName: 'modules',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false, // We handle soft deletes manually with deleted_at
});

// Define associations
Module.associate = function(models) {
  if (Module._associationsInitialized) return;
  const { User, Tenant, Healthcheck, Healthhistory, Apikey, TenantModule, RoleModule, Role } = models;

  Module.belongsTo(User, { foreignKey: 'registered_by', as: 'registeredby', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  Module.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(Module, { foreignKey: 'registered_by', as: 'modules', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  // Note: Tenant.hasMany removed - using belongsToMany through tenant_modules instead
  
  // Many-to-many relationship with tenants through tenant_modules
  Module.belongsToMany(Tenant, {
    through: TenantModule,
    foreignKey: 'module_id',
    otherKey: 'tenant_id',
    as: 'assignedTenants',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  
  // Many-to-many relationship with roles through role_modules
  Module.belongsToMany(Role, {
    through: RoleModule,
    foreignKey: 'module_id',
    otherKey: 'role_id',
    as: 'assignedRoles',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  
  // Health checks and history associations with CASCADE delete
  Module.hasMany(Healthcheck, { foreignKey: 'module_id', as: 'healthchecks', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Module.hasMany(Healthhistory, { foreignKey: 'module_id', as: 'healthhistory', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  
  // API keys association (CASCADE delete - api_keys are deleted when module is deleted)
  Module.hasMany(Apikey, { foreignKey: 'module_id', as: 'apikeys', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  
  Module._associationsInitialized = true;
};


module.exports = Module;

