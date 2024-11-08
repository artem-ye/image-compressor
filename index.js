import http from 'node:http';

import { config } from './src/lib/config.js';
import { logger } from './src/lib/logger.js';
import { Router } from './src/lib/router/router.js';

import { mainRoute } from './src/routes/main.rote.js';
import { healthCheckRoute } from './src/routes/health.route.js';
import { notFoundRoute } from './src/routes/404.route.js';

const { host: HOST, port: PORT } = config;

const router = new Router();
router.setRoute('GET', '/health', healthCheckRoute);
router.setRoute('GET', '/*', mainRoute);

const server = http.createServer((request, response) => {
  const { method, url } = request;
  const { handler = notFoundRoute } = router.route(method, url);
  handler(request, response);
});

server.listen(PORT, HOST, () => {
  const { address, port } = server.address();
  logger.info(`Server started on ${address}:${port}`);
});
