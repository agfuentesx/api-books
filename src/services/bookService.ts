import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { randomUUID } from 'crypto';
import { Book, CreateBookRequest } from '../models/book';

export class BookService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

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

    try {
      const [rows] = await this.db.execute<RowDataPacket[]>(query, [id]);

      if (rows.length === 0) {
        return null;
      }

      return rows[0] as Book;
    } catch (error) {
      console.error('Error getting book by ID:', error);
      throw error;
    }
  }

  async createBook(bookData: CreateBookRequest): Promise<Book> {
    const id = randomUUID();
    const now = new Date();

    const query = `
      INSERT INTO books (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    try {
      await this.db.execute<ResultSetHeader>(query, [
        id,
        bookData.name,
        bookData.description,
        now,
        now,
      ]);

      const createdBook = await this.getBookById(id);

      if (!createdBook) {
        throw new Error('Error retrieving created book');
      }

      return createdBook;
    } catch (error) {
      console.error('Error creating book:', error);
      throw error;
    }
  }
}