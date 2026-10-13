import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

function publicAddress(address: string) {
  if (isIP(address) === 6) return /^2[0-9a-f]{3}:/i.test(address) && !address.toLowerCase().startsWith('2001:db8:');
  const [a, b] = address.split('.').map(Number);
  return a !== undefined && b !== undefined && a > 0 && a < 224 &&
    ![10, 127].includes(a) && !(a === 169 && b === 254) &&
    !(a === 172 && b >= 16 && b <= 31) && !(a === 192 && (b === 168 || b === 0)) &&
    !(a === 100 && b >= 64 && b <= 127) && !(a === 198 && (b === 18 || b === 19));
}

export async function fetchRemoteImage(input: string) {
  let url = new URL(input);
  for (let hop = 0; hop < 5; hop++) {
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      (url.port && !['80', '443'].includes(url.port))) throw Error('Please use a public image URL.');
    const addresses = await lookup(url.hostname.replace(/^\[|\]$/g, ''), { all: true });
    if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) throw Error('Only public image hosts are supported.');
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const next = response.headers.get('location');
      if (!next) throw Error('Invalid image redirect.');
      url = new URL(next, url); continue;
    }
    if (!response.ok) throw Error(`Image host returned HTTP ${response.status}. Upload the image from your computer instead.`);
    const type = (response.headers.get('content-type') || '').split(';')[0]!;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw Error('Use a JPEG, PNG or WebP image.');
    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 12 * 1024 * 1024) { await reader.cancel(); throw Error('Image exceeds 12 MB.'); }
      chunks.push(value);
    }
    return new Blob(chunks, { type });
  }
  throw Error('Too many image redirects.');
}
