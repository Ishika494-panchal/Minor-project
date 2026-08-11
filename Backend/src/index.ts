import app from './app';
import { env } from './config/env';

const PORT = parseInt(env.PORT, 10) || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Mini ERP Operations Portal Server running on port ${PORT}`);
  console.log(`⚡ Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 API base: http://localhost:${PORT}/api`);
});
