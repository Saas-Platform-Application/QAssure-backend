const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const UserModule = sequelize.define(
  "UserModule",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    module_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "modules",
        key: "id",
      },
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "tenants",
        key: "id",
      },
    },
    assigned_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "user_modules",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["user_id", "module_id", "tenant_id"],
        name: "idx_user_module_unique",
      },
    ],
  },
);

UserModule.associate = (models) => {
  if (UserModule._associationsInitialized) return;
  const { User, Module, Tenant } = models;

  UserModule.belongsTo(User, { foreignKey: "user_id", as: "user" });
  UserModule.belongsTo(Module, { foreignKey: "module_id", as: "module" });
  UserModule.belongsTo(Tenant, { foreignKey: "tenant_id", as: "tenant" });

  UserModule._associationsInitialized = true;
};

module.exports = UserModule;
