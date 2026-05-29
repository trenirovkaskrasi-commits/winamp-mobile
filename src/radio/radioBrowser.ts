export interface RadioStation {
  changeuuid: string;
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  codec: string;
  bitrate: number;
  lastcheckok: number;
}

let cachedServers: string[] = ["de1.api.radio-browser.info", "fr1.api.radio-browser.info", "nl1.api.radio-browser.info"];
let lastFetchTime = 0;

async function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

async function refreshServersIfNeeded() {
  const now = Date.now();
  if (now - lastFetchTime < 10 * 60 * 1000) return; // 10 minutes cache

  try {
    const res = await fetchWithTimeout('https://all.api.radio-browser.info/json/servers', 5000);
    if (!res.ok) throw new Error('Failed to fetch mirrors');
    const data = await res.json();
    const servers = data.map((s: any) => s.name).filter(Boolean);
    if (servers.length > 0) {
      cachedServers = servers;
      lastFetchTime = now;
    }
  } catch (err) {
    console.warn("Failed to refresh radio browser mirrors, preserving cache", err);
  }
}

async function fetchWithRetry(path: string, options: RequestInit = {}): Promise<any> {
  await refreshServersIfNeeded();
  
  // Randomized mirror rotation
  const shuffled = [...cachedServers].sort(() => 0.5 - Math.random());
  
  for (let i = 0; i < shuffled.length; i++) {
    const server = shuffled[i];
    try {
      const url = `https://${server}${path}`;
      const res = await fetchWithTimeout(url, 7000); // 7s timeout per mirror
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn(`Mirror ${server} failed, trying next...`);
    }
  }
  throw new Error("All radio-browser mirrors failed");
}

export async function searchRadioStations(query: { name?: string; tag?: string }): Promise<RadioStation[]> {
  const params = new URLSearchParams();
  params.append('limit', '100');
  params.append('order', 'votes');
  params.append('reverse', 'true');
  params.append('hidebroken', 'true');
  
  if (query.name) params.append('name', query.name);
  if (query.tag) params.append('tag', query.tag);

  const data = await fetchWithRetry(`/json/stations/search?${params.toString()}`);
  
  // Filter malformed/dead streams
  return data.filter((station: any) => {
    return station.lastcheckok === 1 &&
           station.url_resolved &&
           station.url_resolved.trim() !== '' &&
           station.bitrate > 0 &&
           station.codec &&
           station.codec.trim() !== '';
  });
}
