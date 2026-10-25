import app from './app.js';
import { env, missingEnv } from './config/env.js';

if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}. Copy .env.example to server/.env`);
  process.exit(1);
}
app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`));
