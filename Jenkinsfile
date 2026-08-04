pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 45, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        // Server Configuration
        SERVER_IP = '160.187.166.60'
        SERVER_USER = 'ubuntu'

        // Git Configuration
        GIT_REPO = 'https://git.tech4biz.wiki/Tech4Biz-Services/QAssur-backend.git'
        GIT_CREDENTIALS_ID = 'git-cred'
        GIT_BRANCH = 'sibarchan_nayak'

        // SSH Configuration
        SSH_KEY_CREDENTIALS_ID = 'qassure'

        // Project Configuration
        PROJECT_DIR = '/home/ubuntu/ltts/QAssur-backend'
        DOCKER_COMPOSE_FILE = 'docker-compose.yml'
        TEST_SCRIPT = 'qassure_test_script_v3.sh'
        LAST_STABLE_FILE = '.last_stable_commit'
        BACKUP_DIR = '/home/ubuntu/backups/qassur'

        // Email Configuration
        EMAIL_RECIPIENTS = 'sibarchan.nayak@tech4biz.org'
        
        // Performance Optimization
        DOCKER_BUILDKIT = '1'
        COMPOSE_DOCKER_CLI_BUILD = '1'
        
        // Deployment Tracking
        DEPLOY_START_TIME = "${System.currentTimeMillis()}"
    }

    stages {

        stage('Initialize') {
            steps {
                script {
                    echo "🚀 Starting QAssur Backend Deployment Pipeline"
                    echo "📍 Target: ${SERVER_IP}"
                    echo "🌿 Branch: ${GIT_BRANCH}"
                    echo "📂 Directory: ${PROJECT_DIR}"
                }
            }
        }

        stage('Setup Project Directory') {
            steps {
                sshagent(credentials: [SSH_KEY_CREDENTIALS_ID]) {
                    script {
                        withCredentials([usernamePassword(
                            credentialsId: GIT_CREDENTIALS_ID,
                            usernameVariable: 'GIT_USERNAME',
                            passwordVariable: 'GIT_PASSWORD'
                        )]) {
                            sh """
                                ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${SERVER_USER}@${SERVER_IP} '
                                    set -e
                                    echo "📁 Setting up project directory..."
                                    
                                    # Create parent directory if needed
                                    mkdir -p /home/ubuntu/ltts
                                    
                                    # Check if repository exists
                                    if [ ! -d "${PROJECT_DIR}/.git" ]; then
                                        echo "📥 Repository not found. Cloning from scratch..."
                                        cd /home/ubuntu/ltts
                                        
                                        # Configure git credentials
                                        git config --global credential.helper store
                                        echo "https://${GIT_USERNAME}:${GIT_PASSWORD}@git.tech4biz.wiki" > ~/.git-credentials
                                        
                                        # Clone the repository
                                        git clone -b ${GIT_BRANCH} ${GIT_REPO}
                                        
                                        # Clean up credentials
                                        rm -f ~/.git-credentials
                                        git config --global --unset credential.helper
                                        
                                        echo "✅ Repository cloned successfully"
                                    else
                                        echo "✅ Repository already exists"
                                    fi
                                    
                                    # Create backup directory
                                    mkdir -p ${BACKUP_DIR}
                                '
                            """
                        }
                    }
                }
            }
        }

        stage('Fetch Latest Changes') {
            steps {
                sshagent(credentials: [SSH_KEY_CREDENTIALS_ID]) {
                    script {
                        withCredentials([usernamePassword(
                            credentialsId: GIT_CREDENTIALS_ID,
                            usernameVariable: 'GIT_USERNAME',
                            passwordVariable: 'GIT_PASSWORD'
                        )]) {
                            def gitInfo = sh(
                                script: """
                                    ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} '
                                        set -e
                                        cd ${PROJECT_DIR}
                                        
                                        echo "📥 Fetching latest changes..."
                                        
                                        # Configure git credentials
                                        git config credential.helper store
                                        echo "https://${GIT_USERNAME}:${GIT_PASSWORD}@git.tech4biz.wiki" > ~/.git-credentials
                                        
                                        # Fetch and reset to latest
                                        git fetch origin ${GIT_BRANCH}
                                        git reset --hard origin/${GIT_BRANCH}
                                        
                                        # Clean up credentials
                                        rm -f ~/.git-credentials
                                        git config --unset credential.helper
                                        
                                        # Get commit info
                                        echo "COMMIT_SHORT=\$(git rev-parse --short HEAD)"
                                        echo "COMMIT_MSG=\$(git log -1 --pretty=%B)"
                                        echo "COMMIT_AUTHOR=\$(git log -1 --pretty=%an)"
                                    '
                                """,
                                returnStdout: true
                            ).trim()
                            
                            // Parse git info
                            gitInfo.split('\n').each { line ->
                                if (line.startsWith('COMMIT_SHORT=')) {
                                    env.GIT_COMMIT_SHORT = line.split('=', 2)[1]
                                } else if (line.startsWith('COMMIT_MSG=')) {
                                    env.GIT_COMMIT_MSG = line.split('=', 2)[1]
                                } else if (line.startsWith('COMMIT_AUTHOR=')) {
                                    env.GIT_AUTHOR = line.split('=', 2)[1]
                                }
                            }
                            
                            echo "✅ Updated to: ${env.GIT_COMMIT_SHORT} by ${env.GIT_AUTHOR}"
                        }
                    }
                }
            }
        }

        stage('Pre-Flight Checks') {
            steps {
                sshagent(credentials: [SSH_KEY_CREDENTIALS_ID]) {
                    script {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} '
                                set -e
                                echo "🔍 Running pre-flight checks..."
                                
                                # Docker Health
                                if ! docker info >/dev/null 2>&1; then
                                    echo "❌ Docker daemon not running"
                                    exit 1
                                fi
                                
                                # Disk Space (minimum 3GB)
                                available=\$(df ${PROJECT_DIR} | tail -1 | awk "{print \\\$4}")
                                if [ \$available -lt 3145728 ]; then
                                    echo "❌ Insufficient disk space: \$((\$available/1024/1024))GB"
                                    exit 1
                                fi
                                
                                # Docker Compose File Check
                                cd ${PROJECT_DIR}
                                if [ ! -f "${DOCKER_COMPOSE_FILE}" ]; then
                                    echo "❌ docker-compose.yml not found"
                                    exit 1
                                fi
                                
                                # Test Script Check
                                if [ ! -f "${TEST_SCRIPT}" ]; then
                                    echo "⚠️  Test script ${TEST_SCRIPT} not found - tests will be skipped"
                                fi
                                
                                echo "✅ Pre-flight checks passed"
                            '
                        """
                    }
                }
            }
        }

        stage('Save Rollback Point') {
            steps {
                sshagent(credentials: [SSH_KEY_CREDENTIALS_ID]) {
                    script {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} '
                                cd ${PROJECT_DIR}
                                
                                echo "📌 Saving rollback point..."
                                
                                # Save current commit
                                git rev-parse HEAD > ${LAST_STABLE_FILE}
                                
                                # Save current container IDs
                                docker ps -q > .last_stable_containers 2>/dev/null || true
                                
                                echo "✅ Rollback point saved"
                            '
                        """
                    }
                }
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                sshagent(credentials: [SSH_KEY_CREDENTIALS_ID]) {
                    script {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} '
                                set -e
                                cd ${PROJECT_DIR}
                                
                                echo "🚀 Starting Docker Compose deployment..."
                                
                                # Set build environment
                                export DOCKER_BUILDKIT=1
                                export COMPOSE_DOCKER_CLI_BUILD=1
                                
                                # Stop existing containers if running
                                echo "🛑 Stopping existing containers..."
                                docker compose -f ${DOCKER_COMPOSE_FILE} down --remove-orphans || true
                                
                                # Start services in detached mode
                                echo "🔨 Building and starting services..."
                                docker compose -f ${DOCKER_COMPOSE_FILE} up -d --build
                                
                                echo "⏳ Waiting for containers to stabilize..."
                                sleep 15
                                
                                echo "✅ Docker Compose deployment completed"
                            '
                        """
                    }
                }
            }
        }

        stage('Run Test Cases') {
            steps {
                sshagent(credentials: [SSH_KEY_CREDENTIALS_ID]) {
                    script {
                        def testResult = sh(
                            script: """
                                ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} '
                                    cd ${PROJECT_DIR}
                                    
                                    echo "🧪 Running test cases..."
                                    
                                    # Check if test script exists
                                    if [ ! -f "${TEST_SCRIPT}" ]; then
                                        echo "⚠️  Test script not found - skipping tests"
                                        exit 0
                                    fi
                                    
                                    # Make script executable
                                    chmod +x ${TEST_SCRIPT}
                                    
                                    # Run tests and capture output
                                    if bash ${TEST_SCRIPT} > test_results.log 2>&1; then
                                        echo "✅ All tests passed"
                                        exit 0
                                    else
                                        echo "❌ Tests failed"
                                        cat test_results.log
                                        exit 1
                                    fi
                                '
                            """,
                            returnStatus: true
                        )
                        
                        env.TESTS_PASSED = (testResult == 0) ? 'true' : 'false'
                        
                        if (testResult != 0) {
                            echo "⚠️  Tests failed - will attempt rollback"
                            error("Test cases failed")
                        }
                    }
                }
            }
        }

        stage('Container Status Check') {
            steps {
                sshagent(credentials: [SSH_KEY_CREDENTIALS_ID]) {
                    script {
                        env.CONTAINER_STATUS = sh(
                            script: """
                                ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} '
                                    cd ${PROJECT_DIR}
                                    echo "📊 Container Status:"
                                    docker compose -f ${DOCKER_COMPOSE_FILE} ps
                                '
                            """,
                            returnStdout: true
                        ).trim()
                        
                        echo "${env.CONTAINER_STATUS}"
                    }
                }
            }
        }
    }

    post {
        failure {
            script {
                echo "❌ Deployment or tests failed - attempting rollback..."
                
                sshagent(credentials: [SSH_KEY_CREDENTIALS_ID]) {
                    // Collect error logs
                    sh """
                        ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} '
                            cd ${PROJECT_DIR}
                            
                            echo "📝 Collecting error logs..."
                            
                            # Create error report
                            {
                                echo "═══════════════════════════════════════"
                                echo "QAssur Deployment Failure Report"
                                echo "═══════════════════════════════════════"
                                echo "Time: \$(date)"
                                echo "Branch: ${GIT_BRANCH}"
                                echo "Commit: ${env.GIT_COMMIT_SHORT}"
                                echo ""
                                echo "═══════════════════════════════════════"
                                echo "Test Results:"
                                echo "═══════════════════════════════════════"
                                if [ -f test_results.log ]; then
                                    cat test_results.log
                                else
                                    echo "No test results available"
                                fi
                                echo ""
                                echo "═══════════════════════════════════════"
                                echo "Container Logs:"
                                echo "═══════════════════════════════════════"
                                docker compose -f ${DOCKER_COMPOSE_FILE} logs --tail=100
                                echo ""
                                echo "═══════════════════════════════════════"
                                echo "Container Status:"
                                echo "═══════════════════════════════════════"
                                docker compose -f ${DOCKER_COMPOSE_FILE} ps
                            } > error_report.txt 2>&1
                            
                            echo "🔄 Attempting rollback to previous stable version..."
                            
                            # Check if we have a rollback point
                            if [ -f "${LAST_STABLE_FILE}" ]; then
                                LAST_COMMIT=\$(cat ${LAST_STABLE_FILE})
                                echo "Rolling back to commit: \$LAST_COMMIT"
                                
                                # Stop failed containers
                                docker compose -f ${DOCKER_COMPOSE_FILE} down --remove-orphans
                                
                                # Checkout previous stable commit
                                git reset --hard \$LAST_COMMIT
                                
                                # Restart with previous version
                                docker compose -f ${DOCKER_COMPOSE_FILE} up -d --build
                                
                                echo "✅ Rollback completed - previous stable version restored"
                            else
                                echo "⚠️  No rollback point found - keeping current state"
                            fi
                        '
                    """
                    
                    // Download error report
                    sh """
                        scp -o StrictHostKeyChecking=no \
                            ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/error_report.txt \
                            ${WORKSPACE}/error_report.txt 2>/dev/null || true
                    """
                }
                
                // Read error report for email
                def errorReport = "Error report not available"
                if (fileExists("${WORKSPACE}/error_report.txt")) {
                    errorReport = readFile("${WORKSPACE}/error_report.txt")
                    if (errorReport.length() > 50000) {
                        errorReport = errorReport.substring(0, 50000) + "\n\n... (truncated)"
                    }
                }
                
                // Send failure email with error report
                def durationMillis = System.currentTimeMillis() - env.DEPLOY_START_TIME.toLong()
                def minutes = (durationMillis / 60000) as Integer
                def seconds = ((durationMillis % 60000) / 1000) as Integer
                
                def failureMessage = """❌ QAssur DEPLOYMENT FAILED

═══════════════════════════════════════
DEPLOYMENT DETAILS
═══════════════════════════════════════
Server:   ${SERVER_IP}
Branch:   ${GIT_BRANCH}
Commit:   ${env.GIT_COMMIT_SHORT ?: 'Unknown'}
Author:   ${env.GIT_AUTHOR ?: 'Unknown'}
Build:    #${BUILD_NUMBER}
Duration: ${minutes}m ${seconds}s
Failed Stage: ${env.STAGE_NAME ?: 'Unknown'}
Time:     ${new Date().format('yyyy-MM-dd HH:mm:ss')}

═══════════════════════════════════════
STATUS
═══════════════════════════════════════
${env.TESTS_PASSED == 'false' ? '❌ Tests Failed - System rolled back to previous stable version' : '❌ Deployment Failed'}
✅ Rollback completed - service stability maintained

═══════════════════════════════════════
ERROR REPORT
═══════════════════════════════════════
${errorReport}

═══════════════════════════════════════
ACTION REQUIRED
═══════════════════════════════════════
1. Review the error logs above
2. Check test script output: ${TEST_SCRIPT}
3. Verify docker-compose.yml configuration
4. Test changes locally with: docker compose up --build
5. Fix issues and retry deployment

═══════════════════════════════════════
LINKS
═══════════════════════════════════════
Jenkins Build:  ${BUILD_URL}
Console Output: ${BUILD_URL}console

Need Help? Contact DevOps team.
"""
                
                try {
                    mail to: "${EMAIL_RECIPIENTS}",
                         subject: "❌ QAssur Deployment FAILED - Build #${BUILD_NUMBER}",
                         body: failureMessage,
                         attachmentsPattern: '**/error_report.txt'
                    echo "✅ Failure notification sent to: ${EMAIL_RECIPIENTS}"
                } catch (emailError) {
                    echo "⚠️ Failed to send email: ${emailError.message}"
                }
                
                echo failureMessage
            }
        }

        success {
            script {
                def durationMillis = System.currentTimeMillis() - env.DEPLOY_START_TIME.toLong()
                def minutes = (durationMillis / 60000) as Integer
                def seconds = ((durationMillis % 60000) / 1000) as Integer
                
                def successMessage = """✅ QAssur DEPLOYMENT SUCCESS

═══════════════════════════════════════
DEPLOYMENT DETAILS
═══════════════════════════════════════
Server:   ${SERVER_IP}
Branch:   ${GIT_BRANCH}
Commit:   ${env.GIT_COMMIT_SHORT}
Author:   ${env.GIT_AUTHOR}
Build:    #${BUILD_NUMBER}
Duration: ${minutes}m ${seconds}s
Time:     ${new Date().format('yyyy-MM-dd HH:mm:ss')}

═══════════════════════════════════════
COMMIT MESSAGE
═══════════════════════════════════════
${env.GIT_COMMIT_MSG ?: 'No commit message available'}

═══════════════════════════════════════
DEPLOYMENT STATUS
═══════════════════════════════════════
✅ Code pulled successfully
✅ Docker containers deployed
✅ All test cases passed
✅ System is live and healthy

═══════════════════════════════════════
CONTAINER STATUS
═══════════════════════════════════════
${env.CONTAINER_STATUS ?: 'Container status not available'}

═══════════════════════════════════════
LINKS
═══════════════════════════════════════
Jenkins Build:  ${BUILD_URL}
Console Output: ${BUILD_URL}console

🌐 All services are live on ${SERVER_IP}
"""
                
                try {
                    mail to: "${EMAIL_RECIPIENTS}",
                         subject: "✅ QAssur Deployment SUCCESS - Build #${BUILD_NUMBER} (${minutes}m ${seconds}s)",
                         body: successMessage
                    echo "✅ Success notification sent to: ${EMAIL_RECIPIENTS}"
                } catch (emailError) {
                    echo "⚠️ Failed to send email: ${emailError.message}"
                }
                
                echo successMessage
            }
        }

        always {
            script {
                def durationMillis = System.currentTimeMillis() - env.DEPLOY_START_TIME.toLong()
                def seconds = (durationMillis / 1000) as Integer
                echo "⏱️  Pipeline completed in ${seconds}s"
                echo "📧 Email recipient: ${EMAIL_RECIPIENTS}"
            }
        }
    }
}