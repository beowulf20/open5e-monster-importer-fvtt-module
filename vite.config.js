const { defineConfig } = require('vite');

const open5eApiTarget = process.env.OPEN5E_API_URL
  || process.env.VITE_OPEN5E_API_URL
  || 'http://localhost:8888';

const open5eProxy = {
  '/open5e': {
    target: open5eApiTarget,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/open5e/, '')
  }
};

module.exports = defineConfig({
  server: {
    host: true,
    port: 4173,
    open: '/monster-creator-test.html',
    proxy: open5eProxy
  },
  preview: {
    port: 4174,
    proxy: open5eProxy
  },
  test: {
    watch: false
  }
});
