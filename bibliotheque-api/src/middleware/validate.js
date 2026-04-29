function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] || 'body';
        errors[key] = errors[key] || [];
        errors[key].push(issue.message);
      }
      return res.status(422).json({ success: false, message: 'Validation échouée', errors });
    }
    req.validated = result.data;
    next();
  };
}

module.exports = { validate };
