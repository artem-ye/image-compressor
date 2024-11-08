import { config } from './config.js';

const { upstreamEndpoint: UPSTREAM_ENDPOINT } = config;

export const upstreamUrl = (path) => `${UPSTREAM_ENDPOINT}${path}`;

export const parseResizeOpts = (params) => {
  const VALID_OPTS = ['width', 'height'];

  return Object.entries(params).reduce(
    (acc, [k, v]) => (VALID_OPTS.includes(k) ? { ...acc, [k]: +v } : acc),
    {}
  );

  // const opts = {};
  // for (const [k, v] of Object.entries(params)) {
  //   VALID_OPTS.includes(k) && (opts[k] = parseInt(v));
  // }
  //return opts;
};
