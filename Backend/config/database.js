const sql = require('mssql');
require('dotenv').config(); // make sure dotenv is installed

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

let pool;

const connectDB = async () => {
  try {
    if (pool?.connected) return;
    pool = await new sql.ConnectionPool(dbConfig).connect();
    console.log('SQL Server connected successfully.');
  } catch (err) {
    console.error('Database connection error:', err);
    pool = null;
    throw err;
  }
};

const getPool = () => {
  if (!pool?.connected) {
    throw new Error('Database is not connected. Call connectDB first.');
  }
  return pool;
};

module.exports = { connectDB, getPool, sql };