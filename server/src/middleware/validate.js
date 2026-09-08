/**
 * Joi 校验中间件
 *   validate(schema, 'body' | 'query' | 'params')
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map(d => d.message).join('; '),
        code: 400,
      });
    }
    req[source] = value;
    next();
  };
}

module.exports = validate;