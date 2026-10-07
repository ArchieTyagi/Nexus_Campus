// Catches every error and sends a simple JSON reply.
export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || "Something went wrong";

  // Duplicate value (for example, same email twice)
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || "value";
    message = `This ${field} is already in use`;
  }
  // Mongoose validation (missing or wrong fields)
  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  }
  // Bad id in the URL
  if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}`;
  }

  if (status === 500) console.error(err);
  res.status(status).json({ message });
};
