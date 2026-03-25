const path = require('path');
const os = require('os');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'production';

const PORT = Number(process.env.PORT) || 3006;

function lanIpv4Addresses() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const list of Object.values(nets)) {
    if (!list) continue;
    for (const net of list) {
      const v4 = net.family === 'IPv4' || net.family === 4;
      if (v4 && !net.internal) out.push(net.address);
    }
  }
  return out;
}

const ips = lanIpv4Addresses();
console.log('');
console.log('Survey app (production, LAN) — students open one of these URLs:');
if (ips.length === 0) {
  console.log(`  http://<this-computer-IPv4>:${PORT}`);
  console.log('  (Run ipconfig and use your Wi‑Fi/Ethernet IPv4 address.)');
} else {
  for (const ip of ips) {
    console.log(`  http://${ip}:${PORT}`);
  }
}
console.log('');
console.log(`Listening on all interfaces, port ${PORT} (0.0.0.0).`);
console.log('');

require('../src/index.js');
