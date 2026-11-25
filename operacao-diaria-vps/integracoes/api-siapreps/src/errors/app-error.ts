export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details?: any[];
    public readonly timestamp: Date;

    constructor(statusCode: number, code: string, message: string, details?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details || [];
    this.timestamp = new Date();
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
    }
}