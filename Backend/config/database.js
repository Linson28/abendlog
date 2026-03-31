const sql = require('mssql');

const dbConfig = {
  server: '10.238.3.11',
  database: 'Abend_tool',
  user: 'sa',
  password: 'zena',
  options: {
    encrypt: true,
    trustServerCertificate: true,
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