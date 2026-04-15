function validateBody(schema) {
  return function validationMiddleware(req, _res, next) {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return next({
        statusCode: 400,
        message: parsed.error.issues[0]?.message || "Invalid request body.",
      });
    }

    req.validatedBody = parsed.data;
    return next();
  };
}

function validateQuery(schema) {
  return function validationMiddleware(req, _res, next) {
    const parsed = schema.safeParse(req.query);

    if (!parsed.success) {
      return next({
        statusCode: 400,
        message: parsed.error.issues[0]?.message || "Invalid query string.",
      });
    }

    req.validatedQuery = parsed.data;
    return next();
  };
}

module.exports = {
  validateBody,
  validateQuery,
};
