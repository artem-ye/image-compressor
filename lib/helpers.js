import { config } from './config.js';

const { upstreamEndpoint: UPSTREAM_ENDPOINT } = config;

export const upstreamUrl = (path) => `${UPSTREAM_ENDPOINT}${path}`;

export const buildResponseHeaders = ({ headers: requestHeaders }) => {
  const headers = { 'transfer-encoding': 'chunked' };
  const { 'content-type': contentType } = requestHeaders;
  contentType && (headers['content-type'] = contentType);
  return headers;
};
