export const healthCheckRoute = (_, response) => {
  response.writeHead(200).end('In works');
};
