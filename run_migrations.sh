#!/bin/bash

# Script to run SQL migration files in Docker qassure-postgres container
# Usage: ./run_migrations.sh

CONTAINER_NAME="qassure-postgres"
DB_NAME="qassure_dev"
DB_USER="postgres"
DB_PASSWORD="postgres123"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running SQL migrations in Docker container: ${CONTAINER_NAME}${NC}"

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}Error: Container $CONTAINER_NAME is not running!${NC}"
    echo "Please start it with: docker-compose up -d postgres"
    exit 1
fi

# Define the order of SQL files to execute
SQL_FILES=(
    "create_knowledge_tables.sql"
    "create_prompt_versions_table.sql"
    "create_qms_tables.sql"
    "phase12_event_subscriptions_webhooks.sql"
    "phase13_security_fda_part11.sql"
    "phase14_workflow_engine.sql"
    "phase15_document_management.sql"
    "phase16_training_management.sql"
    "phase17_capa_management.sql"
    "phase18_supplier_quality.sql"
    "phase19_reporting_analytics.sql"
    "phase20_notifications.sql"
    "phase21_file_attachments.sql"
    "phase22_system_configuration.sql"
    "phase23_project_service.sql"
    "phase24_license_billing.sql"
)

# Function to execute SQL file
execute_sql_file() {
    local file=$1
    local file_path="src/migrations/$file"
    
    if [ ! -f "$file_path" ]; then
        echo -e "${RED}Error: File $file_path not found!${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Executing: $file${NC}"
    
    # Execute SQL file using docker exec
    if docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$file_path" 2>&1; then
        echo -e "${GREEN}✓ Successfully executed: $file${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to execute: $file${NC}"
        return 1
    fi
}

# Execute all SQL files
failed_files=()
for sql_file in "${SQL_FILES[@]}"; do
    if ! execute_sql_file "$sql_file"; then
        failed_files+=("$sql_file")
    fi
    echo ""
done

# Summary
echo "=========================================="
if [ ${#failed_files[@]} -eq 0 ]; then
    echo -e "${GREEN}All migrations completed successfully!${NC}"
    exit 0
else
    echo -e "${RED}Some migrations failed:${NC}"
    for file in "${failed_files[@]}"; do
        echo -e "${RED}  - $file${NC}"
    done
    exit 1
fi
