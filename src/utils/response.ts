import { APIGatewayProxyResult } from "aws-lambda";
import { ApiResponse } from "../models/book";

export const buildResponse = <T>(
  statusCode: number,
  body: ApiResponse<T>
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
    body: JSON.stringify(body),
  };
};

export const successResponse = <T>(
  data: T,
  statusCode: number = 200
): APIGatewayProxyResult => {
  return buildResponse(statusCode, {
    success: true,
    data,
  });
};

export const errorResponse = (
  message: string,
  statusCode: number = 500
): APIGatewayProxyResult => {
  return buildResponse(statusCode, {
    success: false,
    error: message,
  });
};