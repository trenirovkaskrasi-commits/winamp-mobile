// This file is used primarily in server.ts (Node JS proxy) to strip ICY metadata.
import { Transform } from 'stream';

export class IcyTransform extends Transform {
  private metaInt: number;
  private metaIntBytesRead: number = 0;
  private isReadingMetadata: boolean = false;
  private metadataLengthBytesToRead: number = 0;
  private metadataBuffer: Buffer = Buffer.alloc(0);
  
  public currentMetadata: Record<string, string> = {};

  constructor(metaInt: number) {
    super();
    this.metaInt = metaInt;
  }

  _transform(chunk: Buffer, encoding: string, callback: Function) {
    if (this.metaInt === 0) {
      this.push(chunk);
      return callback();
    }

    let offset = 0;
    while (offset < chunk.length) {
      if (this.isReadingMetadata) {
        if (this.metadataLengthBytesToRead === 0) {
          const lengthByte = chunk[offset++];
          this.metadataLengthBytesToRead = lengthByte * 16;
          
          if (this.metadataLengthBytesToRead === 0) {
            this.isReadingMetadata = false;
            this.metaIntBytesRead = 0;
          }
        } else {
          const available = Math.min(chunk.length - offset, this.metadataLengthBytesToRead);
          const metaChunk = chunk.subarray(offset, offset + available);
          
          this.metadataBuffer = Buffer.concat([this.metadataBuffer, metaChunk]);
          this.metadataLengthBytesToRead -= available;
          offset += available;

          if (this.metadataLengthBytesToRead === 0) {
            this.isReadingMetadata = false;
            this.metaIntBytesRead = 0;
            this.parseMetadataText(this.metadataBuffer.toString('utf8'));
            this.metadataBuffer = Buffer.alloc(0);
          }
        }
      } else {
        const remainingToMeta = this.metaInt - this.metaIntBytesRead;
        const available = Math.min(chunk.length - offset, remainingToMeta);
        
        const audioChunk = chunk.subarray(offset, offset + available);
        this.push(audioChunk); // Push only the clean audio data
        
        this.metaIntBytesRead += available;
        offset += available;

        if (this.metaIntBytesRead === this.metaInt) {
          this.isReadingMetadata = true;
          this.metadataLengthBytesToRead = 0;
        }
      }
    }
    callback();
  }

  private parseMetadataText(text: string) {
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
      this.currentMetadata = { ...this.currentMetadata, ...data };
      this.emit('metadata', this.currentMetadata);
    }
  }
}
