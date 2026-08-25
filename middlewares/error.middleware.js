const errorHandler = (err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    error:
      statusCode === 500
        ? "Internal Server Error"
        : err.message || "Something went wrong",
  });
};

export default errorHandler;