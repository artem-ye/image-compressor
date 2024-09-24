import { createServer } from 'node:http';
import { PassThrough, Readable } from 'node:stream';

import sharp from 'sharp';
import { config } from './lib/config.js';
import { parseUrl, parseResizeOpts } from './lib/config.js';

const { host: HOST, port: PORT, proxyEndpoint: PROXY_ENDPOINT } = config;
const HTTP_INTERNAL_SERVER_ERR = 500;
const proxyURL = (path) => `${PROXY_ENDPOINT}${path}`;

const buildResponseHeaders = ({ headers: requestHeaders }) => {
  const newHeaders = { 'transfer-encoding': 'chunked' };
  const contentType = requestHeaders.get('content-type');
  contentType && (newHeaders['content-type'] = contentType);
  return newHeaders;
};

const server = createServer((request, response) => {
  const { uri, params } = parseUrl(request.url);
  const imageUrl = proxyURL(uri);
  const resizeOpts = parseResizeOpts(params);

  response.on('error', (err) => {
    console.log('Response stream error', err.message);
  });

  fetch(imageUrl)
    .then(({ headers, ok, body, status, statusText }) => {
      const responseHeaders = buildResponseHeaders({ headers });
      response.writeHead(status, statusText, responseHeaders);

      const readable = Readable.fromWeb(body).on('error', (e) => {
        console.log('Readable error', e.message);
        response.end('Upstream error');
      });

      const transform = (
        ok ? sharp().resize(resizeOpts) : new PassThrough()
      ).on('error', (e) => {
        console.log('Transform error', e.message);
        response.end('Transform error');
      });

      readable.pipe(transform).pipe(response);
    })
    .catch((err) => {
      console.log(err);
      const msg = 'Internal server error';
      response.headersSent || response.writeHead(HTTP_INTERNAL_SERVER_ERR, msg);
      response.end(msg);
    });
});

server.listen(PORT, HOST, () => {
  console.log('Server started on', server.address());
});
