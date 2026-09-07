import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { getDbConnection } from '../config/database';
import { BookService } from '../services/bookService';
import { CreateBookRequest } from '../models/book';
import { successResponse, errorResponse } from '../utils/response';

let bookService: BookService | null = null;

const getBookService = (): BookService => {
  if (!bookService) {
    const db = getDbConnection();
    bookService = new BookService(db);
  }
  return bookService;
};

const validateCreateBookRequest = (
  body: any
): { valid: boolean; error?: string; data?: CreateBookRequest } => {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const { name, description } = body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return {
      valid: false,
      error: "Otra vez vemos estos 'name' is required and must be a non-empty string",
    };
  }

  if (!description || typeof description !== 'string' || description.trim() === '') {
    return {
      valid: false,
      error: "Field 'description' is required and must be a non-empty string",
    };
  }

  if (name.trim().length > 255) {
    return { valid: false, error: "Field 'name' must not exceed 255 characters" };
  }

  if (description.trim().length > 1000) {
    return {
      valid: false,
      error: "Field 'description' must not exceed 1000 characters",
    };
  }

  return {
    valid: true,
    data: {
      name: name.trim(),
      description: description.trim(),
    },
  };
};

const handleGetBook = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const bookId = event.pathParameters?.id;

  if (!bookId) {
    return errorResponse('Book ID is required in path parameters', 400);
  }

  try {
    const service = getBookService();
    const book = await service.getBookById(bookId);

    if (!book) {
      return errorResponse(`Book with ID '${bookId}' not found`, 404);
    }

    return successResponse(book, 200);
  } catch (error) {
    console.error('Error in handleGetBook:', error);
    const message = error instanceof Error ? error.message : 'Error getting book';
    return errorResponse(message, 500);
  }
};

const handleCreateBook = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let parsedBody: any;

  try {
    parsedBody = event.body ? JSON.parse(event.body) : null;
  } catch {
    return errorResponse('Invalid JSON in request body', 400);
  }

  const validation = validateCreateBookRequest(parsedBody);

  if (!validation.valid) {
    return errorResponse(validation.error!, 400);
  }

  try {
    const service = getBookService();
    const newBook = await service.createBook(validation.data!);

    return successResponse(newBook, 201);
  } catch (error) {
    console.error('Error in handleCreateBook:', error);
    const message = error instanceof Error ? error.message : 'Error creating book';
    return errorResponse(message, 500);
  }
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  context.callbackWaitsForEmptyEventLoop = false;

  console.log('Event received:', JSON.stringify({
    method: event.httpMethod,
    path: event.path,
    pathParameters: event.pathParameters,
    body: event.body,
  }));

  try {
    const method = event.httpMethod?.toUpperCase();

    switch (method) {
      case 'GET':
        return await handleGetBook(event);

      case 'POST':
        return await handleCreateBook(event);

      case 'OPTIONS':
        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
          body: '',
        };

      default:
        return errorResponse(`Method '${method}' not allowed`, 405);
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    return errorResponse(errorMessage, 500);
  }
};