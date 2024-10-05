import http from 'node:http';
import { pipeline } from 'node:stream';
import sharp from 'sharp';

import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { parseUrl, parseResizeOpts } from './lib/url.js';

const { host: HOST, port: PORT, upstreamEndpoint: UPSTREAM_ENDPOINT } = config;
const HTTP_INTERNAL_ERROR = 500;
const HTTP_OK = 200;

const upstreamUrl = (path) => `${UPSTREAM_ENDPOINT}${path}`;

const buildResponseHeaders = ({ headers: requestHeaders }) => {
  const headers = { 'transfer-encoding': 'chunked' };
  const { 'content-type': contentType } = requestHeaders;
  contentType && (headers['content-type'] = contentType);
  return headers;
};

const stub = (err) => void (err && logger.error(err.message));

const server = http.createServer((request, response) => {
  const { path, params } = parseUrl(request.url);
  const imageUrl = upstreamUrl(path);
  const resizeOpts = parseResizeOpts(params);

  const logError = (msg) => {
    const { method, url } = request;
    logger.child({ method }).child({ url }).error(msg);
  };

  const abort = (statusCode, statusMessage) => {
    response.headersSent || response.writeHead(statusCode, statusMessage);
    response.end();
  };

  const upstreamReq = http.get(imageUrl, (upstreamResponse) => {
    const { statusCode, statusMessage } = upstreamResponse;

    if (statusCode !== HTTP_OK) {
      logError(`Upstream bad response: ${statusCode} ${statusMessage}`);
      abort(statusCode, statusMessage);
    } else {
      const resize = sharp()
        .resize(resizeOpts)
        .once('readable', () => {
          const headers = buildResponseHeaders(upstreamResponse);
          response.writeHead(statusCode, statusMessage, headers);
        })
        .on('error', (err) => {
          logError(`Resize error: ${err.message}`);
          abort(HTTP_INTERNAL_ERROR, 'Resize error');
          resize.destroy();
        });

      pipeline(upstreamResponse, resize, response, stub);
    }
  });

  upstreamReq.on('error', (err) => {
    logError(`Upstream communication error: ${err.message}`);
    abort(HTTP_INTERNAL_ERROR, 'Upstream communication error');
  });

  pipeline(request, upstreamReq, stub);
});

server.listen(PORT, HOST, () => {
  logger.info('Server started on', JSON.stringify(server.address()));
});
