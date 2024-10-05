import http from 'node:http';
import { pipeline } from 'node:stream';
import sharp from 'sharp';

import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { parseUrl, parseResizeOpts } from './lib/url.js';
import { upstreamUrl, buildResponseHeaders } from './lib/helpers.js';

const { host: HOST, port: PORT } = config;
const HTTP_INTERNAL_ERROR = 500;
const HTTP_OK = 200;

const errorLogger = (method, url) => (msg) =>
  logger.child({ method }).child({ url }).error(msg);

const server = http.createServer((request, response) => {
  const { method, url } = request;
  const { path, params } = parseUrl(url);
  const imageUrl = upstreamUrl(path);
  const resizeOpts = parseResizeOpts(params);

  const logError = errorLogger(method, url);
  const pipelineErrHandler = (err) => void (err && logError(err.message));

  const abort = (statusCode, statusMessage) => {
    if (!response.headersSent) response.writeHead(statusCode, statusMessage);
    response.end();
  };

  const upstreamReq = http.get(imageUrl, (upstreamResponse) => {
    const { statusCode, statusMessage } = upstreamResponse;

    if (statusCode !== HTTP_OK) {
      logError(`Upstream bad response: ${statusCode} ${statusMessage}`);
      abort(statusCode, statusMessage);
    } else {
      const resize = sharp().resize(resizeOpts);

      resize.once('readable', () => {
        const headers = buildResponseHeaders(upstreamResponse);
        response.writeHead(statusCode, statusMessage, headers);
      });
      resize.on('error', (err) => {
        logError(`Resize error: ${err.message}`);
        abort(HTTP_INTERNAL_ERROR, 'Resize error');
        resize.destroy();
      });

      pipeline(upstreamResponse, resize, response, pipelineErrHandler);
    }
  });

  upstreamReq.on('error', (err) => {
    logError(`Upstream communication error: ${err.message}`);
    abort(HTTP_INTERNAL_ERROR, 'Upstream communication error');
  });

  pipeline(request, upstreamReq, pipelineErrHandler);
});

server.listen(PORT, HOST, () => {
  const { address, port } = server.address();
  logger.info(`Server started on ${address}:${port}`);
});
