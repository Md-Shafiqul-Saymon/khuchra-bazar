const path = require('path');

let handler;

module.exports = async (req, res) => {
  if (!handler) {
    // Dynamic path prevents Vercel's nft tracer from following into dist/ at build time
    const mainPath = path.join(process.cwd(), 'dist', 'main');
    const { createApp } = require(mainPath);
    const app = await createApp();
    handler = app.getHttpAdapter().getInstance();
  }
  return handler(req, res);
};
