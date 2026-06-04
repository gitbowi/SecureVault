const errorHandler = (err, _req, res, _next) => {
  console.error(`[Error] ${err.message}`);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum size is 50 MB.' });
  }

  if (err.message?.includes('not allowed')) {
    return res.status(400).json({ message: err.message });
  }

  const status  = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error.';
  res.status(status).json({ message });
};

module.exports = errorHandler;
