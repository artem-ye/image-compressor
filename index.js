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

const pipeStub = (err) => err && logger.error(err.message);

const server = http.createServer((request, response) => {
  const { path, params } = parseUrl(request.url);
  const imageUrl = upstreamUrl(path);
  const resizeOpts = parseResizeOpts(params);

  const logError = (msg) =>
    logger.error(request.method + ' | ' + request.url + ' | ' + msg);

  const upstreamReq = http.get(imageUrl, (upstreamResponse) => {
    const { statusCode, statusMessage } = upstreamResponse;

    if (statusCode !== HTTP_OK) {
      logError(`Upstream bad response: ${statusCode} ${statusMessage}`);
      response.writeHead(statusCode, statusMessage).end();
    } else {
      const sendHeaders = () => {
        const headers = buildResponseHeaders(upstreamResponse);
        response.writeHead(statusCode, statusMessage, headers);
      };

      const resize = sharp()
        .resize(resizeOpts)
        .on('error', (err) => {
          logError('Resize error: ' + err.message);
          response.writeHead(HTTP_INTERNAL_ERROR, 'Resize error').end();
          resize.destroy();
        })
        .once('readable', sendHeaders);

      pipeline(upstreamResponse, resize, response, pipeStub);
    }
  });

  upstreamReq.on('error', (err) => {
    const msg = 'Upstream communication error';
    logError(err.message);
    if (!response.headersSent) response.writeHead(HTTP_INTERNAL_ERROR, msg);
    response.end();
  });

  pipeline(request, upstreamReq, pipeStub);
});

server.listen(PORT, HOST, () => {
  logger.info('Server started on', JSON.stringify(server.address()));
});
