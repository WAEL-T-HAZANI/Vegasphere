const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const flat = result.error.flatten();
      const firstField = Object.keys(flat.fieldErrors || {})[0];
      const firstMessage =
        firstField && flat.fieldErrors[firstField]?.[0]
          ? flat.fieldErrors[firstField][0]
          : "Validation failed";

      return res.status(400).json({
        success: false,
        message: firstMessage,
        details: flat,
      });
    }

    req[source] = result.data;
    return next();
  };
};

module.exports = validate;
