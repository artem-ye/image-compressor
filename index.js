import http from 'node:http';
import { pipeline } from 'node:stream';
import sharp from 'sharp';

import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { photobankClient } from './lib/photobankClient.js';
import { parseUrl } from './lib/url.js';
import { upstreamUrl, parseResizeOpts } from './lib/helpers.js';
import { HTTP_INTERNAL_ERROR } from './lib/const.js';

const { host: HOST, port: PORT } = config;

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

  const sendImage = ({ imageStream, statusCode, statusMessage, headers }) => {
    const resize = sharp().resize(resizeOpts);
    resize.once('readable', () => {
      response.writeHead(statusCode, statusMessage, headers);
    });
    resize.on('error', function (err) {
      log.error(`Resize error: ${err.message}`);
      abort(HTTP_INTERNAL_ERROR, 'Resize error');
      this.destroy();
    });

    pipeline(imageStream, resize, response, handlePipeError);
  };

  const upstreamReq = photobankClient(imageUrl, (err, result) => {
    if (err) {
      log.error(err.message);
      abort(err.statusCode, err.statusMessage);
    } else {
      const { response: imageStream, ...rest } = result;
      sendImage({ imageStream, ...rest });
    }
  });

  pipeline(request, upstreamReq, handlePipeError);
});

server.listen(PORT, HOST, () => {
  const { address, port } = server.address();
  logger.info(`Server started on ${address}:${port}`);
});
