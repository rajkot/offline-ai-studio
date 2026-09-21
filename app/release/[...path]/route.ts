import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const requestedPath = resolvedParams.path.join('/');
    const rootDir = process.cwd();
    const releaseDir = path.join(rootDir, 'public', 'release');
    const filePath = path.join(releaseDir, requestedPath);
    const rootFallbackPath = path.join(rootDir, requestedPath);

    // Look for file in releaseDir, then rootDir
    let targetPath = fs.existsSync(filePath)
      ? filePath
      : (fs.existsSync(rootFallbackPath) ? rootFallbackPath : null);

    // If requested is an installer/release file not found, trigger download route internally
    if (!targetPath && (requestedPath.endsWith('.exe') || requestedPath.endsWith('.zip') || requestedPath.endsWith('.7z'))) {
      const downloadEndpoint = new URL(`/api/desktop/download?file=${encodeURIComponent(requestedPath)}`, req.url);
      const downloadResponse = await fetch(downloadEndpoint.toString(), {
        headers: req.headers
      });
      return downloadResponse;
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      return new Response('File not found', { status: 404 });
    }

    const stat = fs.statSync(targetPath);
    const fileSize = stat.size;
    const fileName = path.basename(targetPath);
    const isExe = fileName.endsWith('.exe');
    const isZip = fileName.endsWith('.zip');
    const is7z = fileName.endsWith('.7z');
    const contentType = isExe
      ? 'application/vnd.microsoft.portable-executable'
      : (isZip ? 'application/zip' : (is7z ? 'application/x-7z-compressed' : 'application/octet-stream'));

    // Handle Range request (HTTP 206)
    const rangeHeader = req.headers.get('range');
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new Response(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
            'Accept-Ranges': 'bytes'
          }
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(targetPath, { start, end });
      const webStream = Readable.toWeb(fileStream);

      return new Response(webStream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'public, max-age=3600',
          'X-Artifact-Size-MB': (fileSize / (1024 * 1024)).toFixed(2)
        }
      });
    }

    // Standard Full GET Stream (HTTP 200) with native Node.js flow control & backpressure
    const fileStream = fs.createReadStream(targetPath);
    const webStream = Readable.toWeb(fileStream);

    return new Response(webStream as any, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize.toString(),
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=3600',
        'X-Artifact-Size-MB': (fileSize / (1024 * 1024)).toFixed(2)
      }
    });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
}
