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
