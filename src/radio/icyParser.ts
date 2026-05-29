export class IcyParser {
  private metaInt: number;
  private audioBuffer: Uint8Array = new Uint8Array(0);
  private metaIntBytesRead: number = 0;
  private isReadingMetadata: boolean = false;
  private metadataLengthBytesToRead: number = 0;
  private onMetadata: (metadata: Record<string, string>) => void;
  private onAudioData: (data: Uint8Array) => void;

  constructor(metaInt: number, onAudioData: (data: Uint8Array) => void, onMetadata: (meta: Record<string, string>) => void) {
    this.metaInt = metaInt;
    this.onAudioData = onAudioData;
    this.onMetadata = onMetadata;
  }

  processChunk(chunk: Uint8Array) {
    if (this.metaInt === 0) {
      this.onAudioData(chunk);
      return;
    }

    let offset = 0;
    while (offset < chunk.length) {
      if (this.isReadingMetadata) {
        if (this.metadataLengthBytesToRead > 0) {
           const size = this.metadataLengthBytesToRead;
           // If we don't have enough buffer for length byte, wait (edge case)
        }
        
        // This is a simplified icy handler since implementing a perfect byte stream parser
        // takes a lot of edge case handling. We'll do a basic one.
        if (this.metadataLengthBytesToRead === 0) {
          const lengthByte = chunk[offset++];
          this.metadataLengthBytesToRead = lengthByte * 16;
          if (this.metadataLengthBytesToRead === 0) {
            this.isReadingMetadata = false;
            this.metaIntBytesRead = 0;
            continue;
          }
        } else {
          // read metadata
          const available = Math.min(chunk.length - offset, this.metadataLengthBytesToRead);
          const metaChunk = chunk.slice(offset, offset + available);
          
          this.audioBuffer = new Uint8Array([...this.audioBuffer, ...metaChunk]);
          this.metadataLengthBytesToRead -= available;
          offset += available;

          if (this.metadataLengthBytesToRead === 0) {
            this.isReadingMetadata = false;
            this.metaIntBytesRead = 0;
            this.parseMetadataText(new TextDecoder('utf-8').decode(this.audioBuffer));
            this.audioBuffer = new Uint8Array(0);
          }
        }
      } else {
        const remainingToMeta = this.metaInt - this.metaIntBytesRead;
        const available = Math.min(chunk.length - offset, remainingToMeta);
        
        const audioChunk = chunk.slice(offset, offset + available);
        this.onAudioData(audioChunk);
        
        this.metaIntBytesRead += available;
        offset += available;

        if (this.metaIntBytesRead === this.metaInt) {
          this.isReadingMetadata = true;
          this.metadataLengthBytesToRead = 0;
        }
      }
    }
  }

  private parseMetadataText(text: string) {
    // text usually looks like: StreamTitle='My Song Title';StreamUrl='...';
    if (!text.trim()) return;
    const parts = text.split(';');
    const data: Record<string, string> = {};
    for (const part of parts) {
      const idx = part.indexOf('=');
      if (idx > -1) {
        const k = part.substring(0, idx).trim();
        let v = part.substring(idx + 1).trim();
        if (v.startsWith("'") && v.endsWith("'")) v = v.substring(1, v.length - 1);
        data[k] = v;
      }
    }
    if (Object.keys(data).length > 0) {
      this.onMetadata(data);
    }
  }
}
