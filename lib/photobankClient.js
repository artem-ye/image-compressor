import http from 'node:http';

import { HTTP_INTERNAL_ERROR, HTTP_OK } from './const.js';

const buildResponseHeaders = ({ headers: requestHeaders }) => {
  const headers = { 'transfer-encoding': 'chunked' };
  const { 'content-type': contentType } = requestHeaders;
  contentType && (headers['content-type'] = contentType);
  return headers;
};

export const photobankClient = (url, cb) => {
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
