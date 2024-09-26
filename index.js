import http from 'node:http';
import { PassThrough } from 'node:stream';

import sharp from 'sharp';
import { config } from './lib/config.js';
import { parseUrl, parseResizeOpts } from './lib/url.js';

const { host: HOST, port: PORT, proxyEndpoint: PROXY_ENDPOINT } = config;
const HTTP_INTERNAL_SERVER_ERR = 500;
const HTTP_OK = 200;
const proxyURL = (path) => `${PROXY_ENDPOINT}${path}`;

const buildResponseHeaders = ({ headers: requestHeaders }) => {
  const headers = { 'transfer-encoding': 'chunked' };
  const contentType = requestHeaders['content-type'];
  contentType && (headers['content-type'] = contentType);
  return headers;
};

const server = http.createServer((request, response) => {
  const { path, params } = parseUrl(request.url);
  const imageUrl = proxyURL(path);
  const resizeOpts = parseResizeOpts(params);

  response.on('error', (err) => {
    console.log('Response stream error', err.message);
  });

  http
    .get(imageUrl, (res) => {
      const { statusCode, statusMessage } = res;
      const headers = buildResponseHeaders(res);
      response.writeHead(statusCode, statusMessage, headers);

      const ok = statusCode === HTTP_OK;
      const transform = (
        ok ? sharp().resize(resizeOpts) : new PassThrough()
      ).on('error', (e) => {
        console.log('Transform error', e.message);
        response.end('Transform error');
      });

      res.pipe(transform).pipe(response);
    })
    .on('error', (err) => {
      console.log(err);
      response.headersSent || response.writeHead(HTTP_INTERNAL_SERVER_ERR);
      response.end('Upstream communication error');
    })
    .end();
});

server.listen(PORT, HOST, () => {
  console.log('Server started on', server.address());
});
