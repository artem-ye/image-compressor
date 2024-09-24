import { URLSearchParams } from 'node:url';

export const parseParams = (params) =>
  Object.fromEntries(new URLSearchParams(params));

export const parseUrl = (url) => {
  const [uri, params] = url.split('?');
  return {
    uri,
    params: parseParams(params),
  };
};

export const parseResizeOpts = (params) => {
  const validKeys = ['width', 'height'];

  const options = {};
  for (const k of Object.keys(params)) {
    validKeys.includes(k) && (options[k] = parseInt(params[k]));
  }

  return options;
};
