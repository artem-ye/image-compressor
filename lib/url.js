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
  const VALID_KEYS = ['width', 'height'];

  const opts = VALID_KEYS.reduce((acc, k) => {
    const v = parseInt(params[k], 10);
    return isNaN(v) ? acc : { ...acc, k: v };
  }, {});

  // const options = {};
  // for (const k of Object.keys(params)) {
  //   validKeys.includes(k) && (options[k] = parseInt(params[k]));
  // }

  return opts;
};
