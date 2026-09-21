import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await context.params;
    const relativePath = Array.isArray(slug) ? slug.join('/') : (slug || '');
    
    // Prevent directory traversal
    const safeRelativePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const rootDir = process.cwd();
    const publicFilePath = path.join(rootDir, 'public', safeRelativePath);
    const releaseFilePath = path.join(rootDir, 'public', 'release', safeRelativePath);
    const rootFilePath = path.join(rootDir, safeRelativePath);

    let resolvedPath: string | null = null;
    if (fs.existsSync(publicFilePath) && !fs.statSync(publicFilePath).isDirectory()) {
      resolvedPath = publicFilePath;
    } else if (fs.existsSync(releaseFilePath) && !fs.statSync(releaseFilePath).isDirectory()) {
      resolvedPath = releaseFilePath;
    } else if (fs.existsSync(rootFilePath) && !fs.statSync(rootFilePath).isDirectory()) {
      resolvedPath = rootFilePath;
    }

    if (!resolvedPath) {
      return new Response(`File not found: ${safeRelativePath}`, { status: 404 });
    }

    const stat = fs.statSync(resolvedPath);
    const fileSize = stat.size;
    const fileName = path.basename(resolvedPath);

    let contentType = 'application/octet-stream';
    if (fileName.endsWith('.exe')) {
      contentType = 'application/vnd.microsoft.portable-executable';
    } else if (fileName.endsWith('.zip')) {
      contentType = 'application/zip';
    } else if (fileName.endsWith('.json')) {
      contentType = 'application/json';
    } else if (fileName.endsWith('.svg')) {
      contentType = 'image/svg+xml';
    } else if (fileName.endsWith('.js')) {
      contentType = 'application/javascript';
    }

    const rangeHeader = req.headers.get('range');
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        return new Response('Requested range not satisfiable', {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
          },
        });
      }

      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(resolvedPath, { start, end });
      const webStream = Readable.toWeb(fileStream) as unknown as ReadableStream;

      return new Response(webStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    const fileStream = fs.createReadStream(resolvedPath);
    const webStream = Readable.toWeb(fileStream) as unknown as ReadableStream;

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileSize.toString(),
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
        'X-Artifact-Size-MB': (fileSize / (1024 * 1024)).toFixed(2),
      },
    });
  } catch (error: any) {
    return new Response(`Server error: ${error.message}`, { status: 500 });
  }
}

export async function HEAD(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await context.params;
    const relativePath = Array.isArray(slug) ? slug.join('/') : (slug || '');
    const safeRelativePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const rootDir = process.cwd();
    const publicFilePath = path.join(rootDir, 'public', safeRelativePath);
    const releaseFilePath = path.join(rootDir, 'public', 'release', safeRelativePath);
    const rootFilePath = path.join(rootDir, safeRelativePath);

    let resolvedPath: string | null = null;
    if (fs.existsSync(publicFilePath) && !fs.statSync(publicFilePath).isDirectory()) {
      resolvedPath = publicFilePath;
    } else if (fs.existsSync(releaseFilePath) && !fs.statSync(releaseFilePath).isDirectory()) {
      resolvedPath = releaseFilePath;
    } else if (fs.existsSync(rootFilePath) && !fs.statSync(rootFilePath).isDirectory()) {
      resolvedPath = rootFilePath;
    }

    if (!resolvedPath) {
      return new Response(null, { status: 404 });
    }

    const stat = fs.statSync(resolvedPath);
    const fileSize = stat.size;
    const fileName = path.basename(resolvedPath);

    let contentType = 'application/octet-stream';
    if (fileName.endsWith('.exe')) {
      contentType = 'application/vnd.microsoft.portable-executable';
    } else if (fileName.endsWith('.zip')) {
      contentType = 'application/zip';
    }

    return new Response(null, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileSize.toString(),
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
        'X-Artifact-Size-MB': (fileSize / (1024 * 1024)).toFixed(2),
      },
    });
  } catch {
    return new Response(null, { status: 500 });
  }
}
