import { getImage } from './getImage.js';

export const imageProxyController = async ({ url: urlParam }) => {
	const [url, searchParams] = ('http:/' + urlParam).split('?');
	if (!URL.canParse(url)) {
		throw new Error('Invalid path');
	}

	const width = new URLSearchParams(searchParams).get('w');

	if (!width) {
		throw new Error('w parameter missing');
	}

	return getImage(url, width);
};
