const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

// Using connection string approach (similar to your working example)
const connectionString = `
Driver={ODBC Driver 18 for SQL Server};
Server=${process.env.DB_SERVER || 'IN-6JSQ8S3\\SQLEXPRESS'};
Database=${process.env.DB_DATABASE || 'Abend_tool'};
Trusted_Connection=Yes;
TrustServerCertificate=Yes;
`.replace(/\n/g, '');

const dbConfig = { connectionString };

let pool;

/**
 * Establishes a connection to the database.
 * If a connection pool already exists and is connected, it does nothing.
 * Otherwise, it creates a new connection pool and connects.
 * @throws {Error} If the database connection fails.
 */
const connectDB = async () => {
  try {
    if (pool && pool.connected) {
      return;
    }
    // Create a new pool and connect
    pool = await new sql.ConnectionPool(dbConfig).connect();
    console.log('SQL Server connected successfully.');
  } catch (err) {
    console.error('Database connection error:', err);
    // Ensure pool is reset on failure
    pool = null;
    // Re-throw the error to be handled by the caller (server.js)
    throw err;
  }
};

/**
 * Returns the active database connection pool.
 * @returns {sql.ConnectionPool} The connection pool.
 * @throws {Error} If the database is not connected.
 */
const getPool = () => {
  if (!pool || !pool.connected) {
    throw new Error('Database is not connected. Call connectDB first.');
  }
  return pool;
};

module.exports = {
  connectDB,
  getPool,
  sql,
};