const PRODUCTION = {
	PORT: 80,
};

const DEV = {
	PORT: 8080,
};

const configs = {
	production: PRODUCTION,
	dev: DEV,
};

const env = process.env.NODE_ENV;
export default configs[env];
