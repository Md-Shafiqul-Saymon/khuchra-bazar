const path = require('path');

let handler;

module.exports = async (req, res) => {
  if (!handler) {
    const distMain = path.resolve(__dirname, '..', 'dist', 'main');
    const { createApp } = require(distMain);
    const app = await createApp();
    handler = app.getHttpAdapter().getInstance();
  }
  return handler(req, res);
};
