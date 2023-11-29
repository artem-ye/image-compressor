import http from 'http';
import { getImage } from './getImage.js';
import config from '../config.js';

const PORT = config.PORT;

const staticRoutes = {
	'/': async () => 'It works',
};

const appRoutes = {
	'/img.nothingshop.com': async (params) => {
		const [url, searchParams] = ('http:/' + params.url).split('?');
		if (!URL.canParse(url)) {
			throw new Error('Invalid path');
		}

		const width = new URLSearchParams(searchParams).get('w');

		if (!width) {
			throw new Error('w parameter missing');
		}

		return getImage(url, width);
	},
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
