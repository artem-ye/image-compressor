import sharp from 'sharp';
import http from 'http';

// const get = async (url) => {
// 	return (await axios.get(url, { responseType: 'arraybuffer' })).data;
// };

const get = (url) => {
	return new Promise((resolve, reject) => {
		http.get(url, (res) => {
			let data = [];
			res.on('data', (chunk) => {
				data.push(chunk);
			});
			res.on('end', () => {
				try {
					resolve(Buffer.concat(data));
				} catch (e) {
					reject(e);
				}
			});
		});
	});
};

export const getImage = async (url, width) => {
	const resp = await get(url);
	return sharp(resp).resize(Number(width)).toBuffer();
};
