import http from 'node:http';

import { HTTP_INTERNAL_ERROR, HTTP_OK } from './const.js';

const buildResponseHeaders = ({ headers: requestHeaders }) => {
  const headers = { 'transfer-encoding': 'chunked' };
  const { 'content-type': contentType } = requestHeaders;
  contentType && (headers['content-type'] = contentType);
  return headers;
};

export const photobankClient = (url, responseHandler) => {
  let errorHandler = null;

  const handleError = (params) => {
    if (!errorHandler) throw new Error(JSON.stringify(params));
    errorHandler(params);
  };

  const req = http.get(url, (response) => {
    const { statusCode, statusMessage } = response;

    if (statusCode !== HTTP_OK) {
      const message = `Upstream bad response: ${statusCode} ${statusMessage}`;
      handleError({ message, statusCode, statusMessage, error: null });
    } else {
      const headers = buildResponseHeaders(response);
      responseHandler({ response, statusCode, statusMessage, headers });
    }
  });

  req.on('error', (error) => {
    handleError({
      message: `Upstream communication error: ${error.message}`,
      statusCode: HTTP_INTERNAL_ERROR,
      statusMessage: 'Upstream communication error',
      error,
    });
  });

  return Object.assign(req, {
    onError(cb) {
      errorHandler = cb;
      return req;
    },
  });
};
