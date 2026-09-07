import { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";
import { Book, CreateBookRequest } from "../models/book";

export class BookService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  // Obtener libro por ID
  async getBookById(id: string): Promise<Book | null> {
    const query = `
      SELECT 
        id,
        name,
        description,
        created_at,
        updated_at
      FROM books
      WHERE id = ?
      LIMIT 1
    `;

    const [rows] = await this.db.execute<RowDataPacket[]>(query, [id]);

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as Book;
  }

  // Crear un nuevo libro
  async createBook(bookData: CreateBookRequest): Promise<Book> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO books (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    await this.db.execute<ResultSetHeader>(query, [
      id,
      bookData.name,
      bookData.description,
      now,
      now,
    ]);

    // Retornar el libro creado
    const createdBook = await this.getBookById(id);

    if (!createdBook) {
      throw new Error("Error retrieving created book");
    }

    return createdBook;
  }
}