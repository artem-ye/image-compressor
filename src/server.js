import http from 'http';
import config from '../config.js';
import { imageProxyController } from './imageCompressor/controller.js';

const PORT = config.PORT;

const staticRoutes = {
	'/': async () => 'It works',
};

const appRoutes = {
	'/img.nothingshop.com': imageProxyController,
	'/img.avelicentia.com': imageProxyController,
};

const serve = async (url, method) => {
	let handler = staticRoutes[url];
	if (!handler) {
		for (const k in appRoutes) {
			if (url.startsWith(k)) {
				handler = appRoutes[k];
				break;
			}
		}
	}

	if (!handler) {
		return {
			code: 404,
			content: 'NOT FOUND',
			type: 'text/plain',
		};
	}

	try {
		const handlerParams = handler.length > 0 ? { url } : null;
		const content = await handler(handlerParams);
		return {
			code: 200,
			content,
			type: typeof content === 'string' ? 'text/plain' : 'image/jpg',
		};
	} catch (err) {
		return {
			code: 500,
			content: err instanceof Error ? err.message : err,
			type: 'text/plain',
		};
	}
};

const server = http.createServer(async (req, res) => {
	const { url, method } = req;

	const result = await serve(url, method);
	const { code, type: contentType, content } = result;

	res.writeHead(code, { 'Content-type': contentType });
	res.end(content);
});

async function httpServer() {
	console.log(`Starting http server on ${PORT}...`);
	return server.listen(PORT);
}

export default httpServer;
