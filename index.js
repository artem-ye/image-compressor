import http from 'node:http';
import { pipeline } from 'node:stream';
import sharp from 'sharp';

import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { parseUrl, parseResizeOpts } from './lib/url.js';
import { upstreamUrl, buildResponseHeaders } from './lib/helpers.js';
import { HTTP_OK, HTTP_INTERNAL_ERROR } from './lib/const.js';

const { host: HOST, port: PORT } = config;

const buildUpstreamRequest = ({ response, path, params, log }) => {
  const imageUrl = upstreamUrl(path);
  const resizeOpts = parseResizeOpts(params);

  const abort = (statusCode, statusMessage) => {
    if (!response.headersSent) response.writeHead(statusCode, statusMessage);
    response.end();
  };

  const upstreamReq = http.get(imageUrl, (upstreamResponse) => {
    const { statusCode, statusMessage } = upstreamResponse;

    if (statusCode !== HTTP_OK) {
      log.error(`Upstream bad response: ${statusCode} ${statusMessage}`);
      abort(statusCode, statusMessage);
    } else {
      const resize = sharp().resize(resizeOpts);

      resize.once('readable', () => {
        const headers = buildResponseHeaders(upstreamResponse);
        response.writeHead(statusCode, statusMessage, headers);
      });
      resize.on('error', function (err) {
        log.error(`Resize error: ${err.message}`);
        abort(HTTP_INTERNAL_ERROR, 'Resize error');
        this.destroy();
      });

      const stub = (e) => void (e && log.error(e.message));
      pipeline(upstreamResponse, resize, response, stub);
    }
  });

  upstreamReq.on('error', (err) => {
    log.error(`Upstream communication error: ${err.message}`);
    abort(HTTP_INTERNAL_ERROR, 'Upstream communication error');
  });

  return upstreamReq;
};

const server = http.createServer((request, response) => {
  const { method, url } = request;
  const { path, params } = parseUrl(url);

  const log = logger.child({ method }).child({ url });

  const upstreamReq = buildUpstreamRequest({ response, path, params, log });
  const stub = (err) => void (err && log.error(err.message));
  pipeline(request, upstreamReq, stub);
});

server.listen(PORT, HOST, () => {
  const { address, port } = server.address();
  logger.info(`Server started on ${address}:${port}`);
});
