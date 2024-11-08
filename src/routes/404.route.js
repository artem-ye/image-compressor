export const notFoundRoute = (_, response) => {
  response.writeHead(404, 'Not found').end('404 Not found');
};
