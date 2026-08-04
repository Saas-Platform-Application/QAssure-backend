"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "category", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "tenant_user",
      comment: "User category: tenant_user or supplier_user",
    });

    await queryInterface.addColumn("users", "supplier_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "suppliers",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // Add indexes for performance
    await queryInterface.addIndex("users", ["category"], {
      name: "idx_users_category",
    });
    await queryInterface.addIndex("users", ["supplier_id"], {
      name: "idx_users_supplier_id",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("users", "idx_users_category");
    await queryInterface.removeIndex("users", "idx_users_supplier_id");
    await queryInterface.removeColumn("users", "category");
    await queryInterface.removeColumn("users", "supplier_id");
  },
};
