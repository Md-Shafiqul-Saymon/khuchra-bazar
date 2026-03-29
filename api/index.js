const { createApp } = require('../dist/main');

let appPromise;

module.exports = async (req, res) => {
  if (!appPromise) {
    appPromise = createApp();
  }
  const app = await appPromise;
  const expressInstance = app.getHttpAdapter().getInstance();
  return expressInstance(req, res);
};
