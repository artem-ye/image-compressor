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

  const abort = (code, message) => {
    if (!response.headersSent) response.writeHead(code, message);
    response.end();
  };

  const replyImage = (imageStream, statusCode, statusMessage, headers) => {
    const resize = sharp()
      .resize(resizeOpts)
      .on('error', () => abort(HTTP_INTERNAL_ERROR, 'Resize error'))
      .once('readable', () =>
        response.writeHead(statusCode, statusMessage, headers)
      );

    pipeline(imageStream, resize, response, stub);
  };

  const upstreamReq = http.get(imageUrl, (upstreamResponse) => {
    const { statusCode, statusMessage } = upstreamResponse;

    if (statusCode !== HTTP_OK) {
      abort(statusCode, statusMessage);
    } else {
      const headers = buildResponseHeaders(upstreamResponse);
      replyImage(upstreamResponse, statusCode, statusMessage, headers);
    }
  });

  upstreamReq.on('error', () => {
    abort(HTTP_INTERNAL_ERROR, 'Upstream communication error');
  });

  pipeline(request, upstreamReq, stub);
});

server.listen(PORT, HOST, () => {
  console.log('Server started on', server.address());
});
