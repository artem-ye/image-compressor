import http from 'node:http';
import { pipeline } from 'node:stream';

import sharp from 'sharp';
import { config } from './lib/config.js';
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

const stub = () => {};

const server = http.createServer((request, response) => {
  const { path, params } = parseUrl(request.url);
  const imageUrl = upstreamUrl(path);
  const resizeOpts = parseResizeOpts(params);

  const upstreamReq = http.get(imageUrl, (upstreamResponse) => {
    const { statusCode, statusMessage } = upstreamResponse;
    const headers = buildResponseHeaders(upstreamResponse);
    response.writeHead(statusCode, statusMessage, headers);

    const abort = () => response.end();

    if (statusCode !== HTTP_OK) {
      abort();
    } else {
      const resize = sharp().resize(resizeOpts).on('error', abort);
      pipeline(upstreamResponse, resize, response, stub);
    }
  });

  upstreamReq.on('error', () =>
    (response.headersSent
      ? response
      : response.writeHead(HTTP_INTERNAL_ERROR, 'Upstream communication error')
    ).end()
  );

  pipeline(request, upstreamReq, stub);
});

server.listen(PORT, HOST, () => {
  console.log('Server started on', server.address());
});
