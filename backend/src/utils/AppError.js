// Throw this anywhere to send a clean error to the frontend.
// Example: throw new AppError("User not found", 404)
export default class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
