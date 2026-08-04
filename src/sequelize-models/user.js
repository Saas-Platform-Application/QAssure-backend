const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,

      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),

      unique: true,

      allowNull: false,
    },
    password_hash: {
      type: DataTypes.STRING(255),

      allowNull: true,
    },
    first_name: {
      type: DataTypes.STRING(100),

      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING(100),

      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,

      allowNull: false,
    },
    auth_provider: {
      type: DataTypes.STRING,

      allowNull: false,
    },
    saml_subject: {
      type: DataTypes.STRING(255),

      unique: true,

      allowNull: true,
    },
    oauth_provider: {
      type: DataTypes.STRING(50),

      allowNull: true,
    },
    oauth_subject: {
      type: DataTypes.STRING(255),

      allowNull: true,
    },
    last_login_at: {
      type: DataTypes.DATE,

      allowNull: true,
    },
    login_count: {
      type: DataTypes.INTEGER,

      allowNull: true,
    },
    last_login_ip: {
      type: DataTypes.STRING(45),

      allowNull: true,
    },
    preferences: {
      type: DataTypes.JSONB,

      allowNull: true,
    },
    signature_pin_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    signature_pin_set_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    password_changed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    password_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failed_login_attempts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    locked_until: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_password_check: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    contact_phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    address_line1: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    address_line2: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    department_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    designation_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "tenant_user",
    },
    supplier_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    force_password_reset: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "users",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false, // We handle soft deletes manually with deleted_at
    indexes: [
      // Case-insensitive unique index on email (matches migration 039)
      // This ensures email uniqueness regardless of case, even if application layer is bypassed
      {
        unique: true,
        name: "idx_users_email_lower",
        fields: [sequelize.literal("LOWER(email)")],
      },
    ],
  },
);

// Associations derived from migrations
User.associate = (models) => {
  if (User._associationsInitialized) return;
  // Outgoing relations are added from the dependent models to avoid double registration.
  User._associationsInitialized = true;
};

module.exports = User;
