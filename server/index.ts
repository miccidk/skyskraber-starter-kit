import app from './app';

const port = Number(process.env.SERVER_PORT) || 3001;

export default {
	fetch: app.fetch,
	port,
};

console.log(`Server running on http://localhost:${port}`);
