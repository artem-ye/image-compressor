import { config } from './config.js';

import { createServer } from 'node:http';
import { PassThrough, Readable } from 'node:stream';
import { URL } from 'node:url';
import sharp from 'sharp';

const { host: HOST, port: PORT, proxyEndpoint: PROXY_ENDPOINT } = config;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const proxyURL = (path) => `${PROXY_ENDPOINT}${path}`;

const server = createServer((request, response) => {
  const { pathname } = new URL(`http://${HOST}${request.url}`);
  const imgUrl = proxyURL(pathname);

  // TODO: set from search params
  const resizeOpts = { width: 50 };

  response.on('error', (err) => {
    console.log('Response stream error', err.message);
  });

  // TODO: add response headers: content-type, content-lenght
  // Hide error in response
  fetch(imgUrl)
    .then(({ status, statusText, ok, body }) => {
      const readeble = Readable.fromWeb(body).on('error', (err) => {
        console.log('Readable stream error', err.message);
        response.end();
      });

      const transform = (
        ok ? sharp().resize(resizeOpts) : new PassThrough()
      ).on('error', (err) => {
        console.log('Transform error', err.message);
        response.end();
      });

      readeble.pipe(transform).pipe(response);

      // setResponseStatus(status, statusText);
      // const transformer = ok ? sharp().resize(resizeOpts) : new PassThrough();

      // Readable.fromWeb(body)
      //   .pipe(transformer)
      //   .on('error', ({ message }) =>
      //     setResponseStatus(HTTP_INTERNAL_SERVER_ERROR, message).end(message)
      //   )
      //   .pipe(response);
    })
    .catch(() =>
      response
        .writeHead(HTTP_INTERNAL_SERVER_ERROR, 'Upstream comunication error')
        .end()
    );
});

server.listen(PORT, HOST, () => {
  console.log('Server started on', server.address());
});
