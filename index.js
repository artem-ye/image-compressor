import http from 'node:http';
import { pipeline } from 'node:stream';
import sharp from 'sharp';

import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { parseUrl, parseResizeOpts } from './lib/url.js';
import { upstreamUrl, buildResponseHeaders } from './lib/helpers.js';
import { HTTP_OK, HTTP_INTERNAL_ERROR } from './lib/const.js';

const { host: HOST, port: PORT } = config;

const photobankClient = (url, cb) => {
  const req = http.get(url, (response) => {
    const { statusCode, statusMessage } = response;

    if (statusCode !== HTTP_OK) {
      const message = `Upstream bad response: ${statusCode} ${statusMessage}`;
      cb({ message, statusCode, statusMessage, error: null });
    } else {
      const headers = buildResponseHeaders(response);
      cb(null, { response, statusCode, statusMessage, headers });
    }
  });

  req.on('error', (error) => {
    cb({
      message: `Upstream communication error: ${error.message}`,
      statusCode: HTTP_INTERNAL_ERROR,
      statusMessage: 'Upstream communication error',
      error,
    });
  });

  return req;
};

const server = http.createServer((request, response) => {
  const { method, url } = request;
  const { path, params } = parseUrl(url);
  const resizeOpts = parseResizeOpts(params);
  const imageUrl = upstreamUrl(path);

  const log = logger.child({ method }).child({ url });
  const handlePipeError = (e) => void (e && log.error(e.message));

  const abort = (statusCode, statusMessage) => {
    if (!response.headersSent) response.writeHead(statusCode, statusMessage);
    response.end();
  };

  const sendImage = ({ image, statusCode, statusMessage, headers }) => {
    const resize = sharp().resize(resizeOpts);
    resize.once('readable', () => {
      response.writeHead(statusCode, statusMessage, headers);
    });
    resize.on('error', function (err) {
      log.error(`Resize error: ${err.message}`);
      abort(HTTP_INTERNAL_ERROR, 'Resize error');
      this.destroy();
    });

    pipeline(image, resize, response, handlePipeError);
  };

  const upstreamReq = photobankClient(imageUrl, (err, result) => {
    if (err) {
      log.error(err.message);
      abort(err.statusCode, err.statusMessage);
    } else {
      const { response: image, ...rest } = result;
      sendImage({ image, ...rest });
    }
  });

  pipeline(request, upstreamReq, handlePipeError);
});

server.listen(PORT, HOST, () => {
  const { address, port } = server.address();
  logger.info(`Server started on ${address}:${port}`);
});
