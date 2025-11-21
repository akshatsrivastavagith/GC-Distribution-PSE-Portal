// Implements same Base62 Razorpay-style ID generation
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const FIRST_JAN_2014_EPOCH_NS = 1388534400 * 1000 * 1000 * 1000;
const EXPECTED_SIZE = 14;

function base62Encode(num) {
  let s = '';
  while (num > 0) { s = BASE62[num % 62] + s; num = Math.floor(num / 62); }
  return s || '0';
}

function generateRzpid() {
  while (true) {
    const nanotime = BigInt(Date.now()) * BigInt(1000000);
    const rand = Math.floor(Math.random() * 9999999999999);
    const b62Time = base62Encode(Number(nanotime - BigInt(FIRST_JAN_2014_EPOCH_NS)));
    const base62Rand = (base62Encode(rand).slice(-4)).padStart(4, '0');
    const rid = b62Time + base62Rand;
    if (rid.length === EXPECTED_SIZE) return rid;
  }
}

module.exports = { generateRzpid };

