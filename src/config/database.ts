import mysql, { Pool, PoolOptions } from "mysql2/promise";

// Configuración de la conexión a RDS
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
    // Habilitar SSL para conexiones seguras con RDS
    rejectUnauthorized: false,
  },
};

// Pool de conexiones reutilizable entre invocaciones Lambda
let pool: Pool | null = null;

export const getDbConnection = (): Pool => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    console.log("Database pool created");
  }
  return pool;
};