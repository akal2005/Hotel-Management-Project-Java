const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const logger = require('./logger');

const initDatabase = async () => {
  const connectionConfig = {
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  };

  logger.info(`Initializing connection to database server at ${connectionConfig.host}:${connectionConfig.port}...`);
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    logger.info('✅ Connected to MySQL server.');

    // 1. Create database if not exists
    const dbName = process.env.DB_NAME || 'hotel_management_db';
    logger.info(`Re-creating database ${dbName}...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await connection.query(`CREATE DATABASE \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);
    logger.info(`✅ Database ${dbName} selected.`);

    // 2. Read and run schema.sql
    const schemaPath = path.join(__dirname, '../schema.sql');
    if (fs.existsSync(schemaPath)) {
      logger.info('Reading schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      // Split statements by semicolon, avoiding splitting inside comments or quoted strings where possible
      const statements = schemaSql
        .split(/;(?=(?:[^'"`]*['"`][^'"`]*['"`])*[^'"`]*$)/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      logger.info(`Running ${statements.length} statements from schema.sql...`);
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        try {
          await connection.query(statement);
        } catch (err) {
          logger.error(`Error running statement #${i + 1}: ${err.message}`);
          logger.debug(`Statement content: ${statement}`);
          throw err;
        }
      }
      logger.info('✅ schema.sql executed successfully.');
    } else {
      logger.warn('schema.sql not found at project root.');
    }

    // 3. Read and run 001_auth_token_columns.sql
    const migrationPath = path.join(__dirname, '../001_auth_token_columns.sql');
    if (fs.existsSync(migrationPath)) {
      logger.info('Reading 001_auth_token_columns.sql...');
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      const statements = migrationSql
        .split(/;(?=(?:[^'"`]*['"`][^'"`]*['"`])*[^'"`]*$)/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      logger.info(`Running ${statements.length} migration statements...`);
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.toLowerCase().startsWith('use ')) continue; // skip USE statement
        try {
          await connection.query(statement);
        } catch (err) {
          logger.warn(`Migration statement #${i + 1} skipped: ${err.message}`);
        }
      }
      logger.info('✅ Migration 001 finished.');
    }

    logger.info('🚀 Database initialization complete!');
  } catch (err) {
    logger.error(`❌ Database initialization failed: ${err.message}`);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

initDatabase();
