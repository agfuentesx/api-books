import { Context } from "aws-lambda";
import mysql, { Connection } from "mysql2/promise";

// Resultado de la inicialización
interface InitResult {
  success: boolean;
  message: string;
  details: {
    databaseCreated: boolean;
    tableCreated: boolean;
    indexesCreated: string[];
  };
}

// Función para obtener una conexión directa (sin pool)
const getConnection = async (): Promise<Connection> => {
  return mysql.createConnection({
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    ssl: {
      rejectUnauthorized: false,
    },
    connectTimeout: 60000,
  });
};

// Inicializar base de datos y tabla
const initializeDatabase = async (): Promise<InitResult> => {
  const dbName = process.env.DB_NAME!;
  const result: InitResult = {
    success: false,
    message: "",
    details: {
      databaseCreated: false,
      tableCreated: false,
      indexesCreated: [],
    },
  };

  const connection = await getConnection();

  try {
    console.log("Starting database initialization...");

    // 1. Crear la base de datos si no existe
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` 
       CHARACTER SET utf8mb4 
       COLLATE utf8mb4_unicode_ci`
    );
    console.log(`Database '${dbName}' ensured`);
    result.details.databaseCreated = true;

    // 2. Seleccionar la base de datos
    await connection.execute(`USE \`${dbName}\``);

    // 3. Crear la tabla books si no existe
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS books (
        id          VARCHAR(36)   NOT NULL,
        name        VARCHAR(255)  NOT NULL,
        description VARCHAR(1000) NOT NULL,
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP 
                                           ON UPDATE CURRENT_TIMESTAMP,

        CONSTRAINT pk_books PRIMARY KEY (id)
      ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_ci
        COMMENT='Table for storing book records';
    `;

    await connection.execute(createTableQuery);
    console.log("Table 'books' ensured");
    result.details.tableCreated = true;

    // 4. Crear índice en name para búsquedas más rápidas
    const indexName = "idx_books_name";
    const checkIndexQuery = `
      SELECT COUNT(*) as count
      FROM information_schema.statistics
      WHERE table_schema = ?
        AND table_name = 'books'
        AND index_name = ?
    `;

    const [indexRows] = await connection.execute<mysql.RowDataPacket[]>(
      checkIndexQuery,
      [dbName, indexName]
    );

    if (indexRows[0].count === 0) {
      await connection.execute(
        `CREATE INDEX ${indexName} ON books (name)`
      );
      console.log(`Index '${indexName}' created`);
      result.details.indexesCreated.push(indexName);
    } else {
      console.log(`Index '${indexName}' already exists, skipping`);
    }

    // 5. Crear índice en created_at para ordenamiento
    const indexCreatedAt = "idx_books_created_at";
    const [indexCreatedRows] = await connection.execute<mysql.RowDataPacket[]>(
      checkIndexQuery,
      [dbName, indexCreatedAt]
    );

    if (indexCreatedRows[0].count === 0) {
      await connection.execute(
        `CREATE INDEX ${indexCreatedAt} ON books (created_at)`
      );
      console.log(`Index '${indexCreatedAt}' created`);
      result.details.indexesCreated.push(indexCreatedAt);
    } else {
      console.log(`Index '${indexCreatedAt}' already exists, skipping`);
    }

    // 6. Verificar la estructura final de la tabla
    const [columns] = await connection.execute<mysql.RowDataPacket[]>(
      `DESCRIBE books`
    );

    console.log("Table structure verified:");
    columns.forEach((col) => {
      console.log(`  - ${col.Field}: ${col.Type} | Null: ${col.Null} | Key: ${col.Key}`);
    });

    result.success = true;
    result.message = "Database initialized successfully";

    return result;
  } finally {
    await connection.end();
    console.log("Connection closed");
  }
};

// Handler de Lambda para inicialización
export const handler = async (
  _event: unknown,
  context: Context
): Promise<InitResult> => {
  context.callbackWaitsForEmptyEventLoop = false;

  // Validar variables de entorno requeridas
  const requiredEnvVars = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    const errorResult: InitResult = {
      success: false,
      message: `Missing required environment variables: ${missingVars.join(", ")}`,
      details: {
        databaseCreated: false,
        tableCreated: false,
        indexesCreated: [],
      },
    };
    console.error(errorResult.message);
    return errorResult;
  }

  try {
    const result = await initializeDatabase();
    console.log("Initialization result:", JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error during initialization";
    
    console.error("Error during database initialization:", error);

    return {
      success: false,
      message: `Initialization failed: ${errorMessage}`,
      details: {
        databaseCreated: false,
        tableCreated: false,
        indexesCreated: [],
      },
    };
  }
};