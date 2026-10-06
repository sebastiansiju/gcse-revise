import app from './app.js';

const portArg = process.argv.find((a) => a.startsWith('--port='))?.slice(7);
const port = Number(portArg || process.env.PORT) || 4000;
app.listen(port, () => console.log(`GCSE Revise API running on http://localhost:${port}`));
