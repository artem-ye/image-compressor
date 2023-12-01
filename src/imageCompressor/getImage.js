import sharp from 'sharp';
import http from 'http';

export const getImage = async (url, width) => {
	const resize = sharp().resize(parseInt(width));
	http.get(url, (res) => res.pipe(resize));
	return resize.toBuffer();
};
