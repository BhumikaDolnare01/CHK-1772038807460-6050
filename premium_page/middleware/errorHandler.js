const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;

  if (process.env.NODE_ENV === "development") {
    console.error("[ERROR]", err);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;
