import mysql, { Pool, PoolOptions } from 'mysql2/promise';

const dbConfig: PoolOptions = {
  host: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000,
  ssl: {
    rejectUnauthorized: false,
  },
};

let pool: Pool | null = null;

export const getDbConnection = (): Pool => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    console.log('Database pool created');
  }
  return pool;
};