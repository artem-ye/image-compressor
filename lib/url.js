import { URLSearchParams } from 'node:url';

export const parseParams = (params) =>
  Object.fromEntries(new URLSearchParams(params));

export const parseUrl = (url) => {
  const [path, params] = url.split('?');
  return {
    path,
    params: parseParams(params),
  };
};

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
