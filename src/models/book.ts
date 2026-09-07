export interface Book {
  id: string;
  name: string;
  description: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateBookRequest {
  name: string;
  description: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}