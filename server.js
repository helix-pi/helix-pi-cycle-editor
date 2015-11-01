var budo = require('budo');

budo('./index.js', {
  live: true,
  port: 8002,
  stream: process.stdout
});
