import * as jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';

self.onmessage = async (e: MessageEvent) => {
  const { trackId, file } = e.data;
  
  if (!file) return;

  jsmediatags.read(file, {
    onSuccess: function(tag: any) {
      const updates: any = {};
      if (tag.tags.title) updates.title = tag.tags.title;
      if (tag.tags.artist) updates.artist = tag.tags.artist;
      if (tag.tags.genre) updates.codec = tag.tags.genre;
      
      self.postMessage({ trackId, updates, success: true });
    },
    onError: function(error: any) {
      self.postMessage({ trackId, error: error.info, success: false });
    }
  });
};
