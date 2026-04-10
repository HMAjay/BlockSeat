// Generic zod validation middleware factory.
const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message
    }));
    return res.status(400).json({ message: "Validation failed", errors });
  }
  req[source] = result.data;
  next();
};

module.exports = validate;
