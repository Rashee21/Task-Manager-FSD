// Joi validation middleware: validate req.body against a schema, reject with 400 + details.
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const e = new Error('Validation failed');
      e.status = 400; e.code = 'VALIDATION_ERROR';
      e.details = error.details.map((d) => d.message);
      return next(e);
    }
    req.body = value;
    next();
  };
}
module.exports = validate;
