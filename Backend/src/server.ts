import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`⚡ Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 API Base endpoint: http://localhost:${PORT}/api`);
});
