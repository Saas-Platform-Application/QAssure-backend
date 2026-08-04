const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Role = sequelize.define(
  "Role",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,

      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT(500),

      allowNull: true,
    },
    scope: {
      type: DataTypes.STRING,

      allowNull: false,
    },
    is_system: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "roles",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false, // We handle soft deletes manually with deleted_at
  },
);

// Associations derived from migrations
Role.associate = (models) => {
  if (Role._associationsInitialized) return;
  const { Module, RoleModule, Tenant } = models;

  // Belongs to tenant
  Role.belongsTo(Tenant, {
    foreignKey: "tenant_id",
    as: "tenant",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  Tenant.hasMany(Role, {
    foreignKey: "tenant_id",
    as: "roles",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  // Many-to-many relationship with modules through role_modules
  Role.belongsToMany(Module, {
    through: RoleModule,
    foreignKey: "role_id",
    otherKey: "module_id",
    as: "assignedModules",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  // Permissions and user relations are attached in their respective models.
  Role._associationsInitialized = true;
};

module.exports = Role;
