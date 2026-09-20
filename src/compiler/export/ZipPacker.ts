"use client";

/**
 * ============================================================================
 * ZIP PACKER (PURE TYPESCRIPT PKZIP ARCHIVE ENCODER)
 * ============================================================================
 * Zero-dependency, standards-compliant ZIP archive encoder capable of
 * packaging directory trees and files in both Node.js and browser environments.
 * Follows the PKWARE .ZIP File Format Specification.
 * ============================================================================
 */

export interface ZipEntry {
  path: string;
  data: Uint8Array;
  date?: Date;
}

export class ZipPacker {
  private entries: ZipEntry[] = [];

  // CRC-32 Lookup Table
  private static crcTable: Uint32Array = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  /**
   * Calculates the standard CRC-32 checksum of a byte buffer.
   */
  public static calculateCrc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    const table = ZipPacker.crcTable;
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  /**
   * Adds a string file to the archive with UTF-8 encoding.
   */
  public addFile(path: string, content: string, date?: Date): this {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    return this.addBinary(path, data, date);
  }

  /**
   * Adds a binary file to the archive.
   */
  public addBinary(path: string, data: Uint8Array, date?: Date): this {
    // Normalize path: replace backslashes with forward slashes and strip leading slash
    const normalizedPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
    this.entries.push({
      path: normalizedPath,
      data,
      date: date || new Date(),
    });
    return this;
  }

  /**
   * Encodes MS-DOS date and time from a JavaScript Date.
   */
  private static toDosDateTime(date: Date): { dosTime: number; dosDate: number } {
    const year = Math.max(1980, date.getFullYear());
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = Math.floor(date.getSeconds() / 2);

    const dosTime = (hours << 11) | (minutes << 5) | seconds;
    const dosDate = ((year - 1980) << 9) | (month << 5) | day;
    return { dosTime, dosDate };
  }

  /**
   * Compiles all entries into a complete PKZIP Uint8Array buffer.
   */
  public build(): Uint8Array {
    const encoder = new TextEncoder();
    const localHeadersAndData: Uint8Array[] = [];
    const centralDirectoryHeaders: Uint8Array[] = [];

    let currentOffset = 0;

    for (const entry of this.entries) {
      const fileNameBytes = encoder.encode(entry.path);
      const crc32 = ZipPacker.calculateCrc32(entry.data);
      const size = entry.data.length;
      const { dosTime, dosDate } = ZipPacker.toDosDateTime(entry.date || new Date());

      // 1. Local File Header (30 bytes + filename)
      const localHeader = new Uint8Array(30 + fileNameBytes.length);
      const lv = new DataView(localHeader.buffer);

      lv.setUint32(0, 0x04034b50, true); // Local file header signature
      lv.setUint16(4, 20, true);         // Version needed to extract (2.0)
      lv.setUint16(6, 0x0800, true);     // General purpose bit flag (Bit 11: UTF-8)
      lv.setUint16(8, 0, true);          // Compression method: 0 (Stored / No compression)
      lv.setUint16(10, dosTime, true);   // File last mod time
      lv.setUint16(12, dosDate, true);   // File last mod date
      lv.setUint32(14, crc32, true);     // CRC-32
      lv.setUint32(18, size, true);      // Compressed size
      lv.setUint32(22, size, true);      // Uncompressed size
      lv.setUint16(26, fileNameBytes.length, true); // File name length
      lv.setUint16(28, 0, true);         // Extra field length

      localHeader.set(fileNameBytes, 30);

      localHeadersAndData.push(localHeader);
      localHeadersAndData.push(entry.data);

      // 2. Central Directory Header (46 bytes + filename)
      const centralHeader = new Uint8Array(46 + fileNameBytes.length);
      const cv = new DataView(centralHeader.buffer);

      cv.setUint32(0, 0x02014b50, true); // Central file header signature
      cv.setUint16(4, 0x0314, true);     // Version made by (UNIX 2.0)
      cv.setUint16(6, 20, true);         // Version needed to extract (2.0)
      cv.setUint16(8, 0x0800, true);     // General purpose bit flag (UTF-8)
      cv.setUint16(10, 0, true);         // Compression method: 0
      cv.setUint16(12, dosTime, true);   // Mod time
      cv.setUint16(14, dosDate, true);   // Mod date
      cv.setUint32(16, crc32, true);     // CRC-32
      cv.setUint32(20, size, true);      // Compressed size
      cv.setUint32(24, size, true);      // Uncompressed size
      cv.setUint16(28, fileNameBytes.length, true); // File name length
      cv.setUint16(30, 0, true);         // Extra field length
      cv.setUint16(32, 0, true);         // Comment length
      cv.setUint16(34, 0, true);         // Disk number start
      cv.setUint16(36, 0, true);         // Internal file attributes
      cv.setUint32(38, 0o100644 << 16, true); // External file attributes (regular file rw-r--r--)
      cv.setUint32(42, currentOffset, true);  // Relative offset of local header

      centralHeader.set(fileNameBytes, 46);
      centralDirectoryHeaders.push(centralHeader);

      currentOffset += localHeader.length + entry.data.length;
    }

    const centralDirectoryOffset = currentOffset;
    let centralDirectorySize = 0;
    for (const ch of centralDirectoryHeaders) {
      centralDirectorySize += ch.length;
    }

    // 3. End of Central Directory Record (22 bytes)
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true); // End of central dir signature
    ev.setUint16(4, 0, true);          // Number of this disk
    ev.setUint16(6, 0, true);          // Disk where central directory starts
    ev.setUint16(8, this.entries.length, true);  // Number of central directory records on this disk
    ev.setUint16(10, this.entries.length, true); // Total number of central directory records
    ev.setUint32(12, centralDirectorySize, true);    // Size of central directory
    ev.setUint32(16, centralDirectoryOffset, true);  // Offset of start of central directory
    ev.setUint16(20, 0, true);         // Comment length

    // Assemble final buffer
    const totalSize = currentOffset + centralDirectorySize + eocd.length;
    const finalBuffer = new Uint8Array(totalSize);

    let writeOffset = 0;
    for (const chunk of localHeadersAndData) {
      finalBuffer.set(chunk, writeOffset);
      writeOffset += chunk.length;
    }

    for (const chunk of centralDirectoryHeaders) {
      finalBuffer.set(chunk, writeOffset);
      writeOffset += chunk.length;
    }

    finalBuffer.set(eocd, writeOffset);

    return finalBuffer;
  }

  /**
   * Returns a browser-compatible Blob of the ZIP archive.
   */
  public toBlob(): Blob {
    const buffer = this.build();
    return new Blob([buffer as any], { type: "application/zip" });
  }

  /**
   * Triggers a browser download of the ZIP file.
   */
  public download(filename: string = "project.zip"): void {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    const blob = this.toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
