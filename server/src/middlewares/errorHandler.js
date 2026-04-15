function notFoundHandler(_req, res) {
  res.status(404).json({
    message: "Route not found.",
  });
}

function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Something went wrong.";

  if (error.code === "23505") {
    statusCode = 409;
    message = "A record with that value already exists.";
  }

  if (error.code === "23503") {
    statusCode = 400;
    message = "That action references a record that does not exist.";
  }

  if (process.env.NODE_ENV !== "test") {
    console.error(error);
  }

  res.status(statusCode).json({
    message,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
