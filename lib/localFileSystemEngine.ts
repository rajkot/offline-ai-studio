/**
 * Local File System Engine (Two-Way Real Disk Sync)
 * 
 * Provides:
 * - W3C File System Access API (window.showDirectoryPicker) for mounting real folders from local disk
 * - Real-time two-way synchronization: edits and Ctrl+S write directly to physical files
 * - File tree traversal with intelligent filtering (ignores node_modules, .git, .next, etc.)
 * - Background file watcher polling for external modifications (e.g. from git, npm, external editors)
 * - Safe error handling, readwrite permission validation, and directory unmounting
 */

export interface DiskFileEntry {
  path: string;
  name: string;
  handle: FileSystemFileHandle;
  lastModified: number;
  size: number;
  isText: boolean;
}

export interface MountedDirectoryInfo {
  directoryName: string;
  handle: FileSystemDirectoryHandle;
  filesCount: number;
  totalSizeBytes: number;
  mountedAt: number;
  isWatching: boolean;
}

export type FileSystemEventType = 
  | 'directory-mounted' 
  | 'directory-unmounted' 
  | 'file-saved' 
  | 'file-created' 
  | 'file-deleted' 
  | 'file-externally-modified';

export interface FileSystemEvent {
  type: FileSystemEventType;
  path?: string;
  directoryName?: string;
  timestamp: number;
  details?: any;
}

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  '.turbo',
  '.cache',
  '.vscode',
  '.idea'
]);

const IGNORED_EXTENSIONS = new Set([
  'exe', 'dll', 'bin', 'iso', 'zip', 'tar', 'gz', '7z',
  'mp4', 'mov', 'avi', 'mp3', 'wav', 'sqlite', 'db'
]);

class LocalFileSystemEngine {
  private activeDirectoryHandle: FileSystemDirectoryHandle | null = null;
  private fileHandlesMap: Map<string, DiskFileEntry> = new Map();
  private fileBufferCache: Map<string, string> = new Map();
  private fileModificationTimes: Map<string, number> = new Map();
  private watcherInterval: any = null;
  private subscribers: Array<(event: FileSystemEvent) => void> = [];
  private isSupported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isSupported = 'showDirectoryPicker' in window;
    }
  }

  public isFileSystemAccessSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }

  public getActiveDirectory(): MountedDirectoryInfo | null {
    if (!this.activeDirectoryHandle) return null;
    let totalSizeBytes = 0;
    this.fileHandlesMap.forEach(f => totalSizeBytes += f.size);

    return {
      directoryName: this.activeDirectoryHandle.name,
      handle: this.activeDirectoryHandle,
      filesCount: this.fileHandlesMap.size,
      totalSizeBytes,
      mountedAt: Date.now(),
      isWatching: this.watcherInterval !== null
    };
  }

  public subscribe(callback: (event: FileSystemEvent) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private emit(event: FileSystemEvent) {
    this.subscribers.forEach(cb => cb(event));
  }

  /**
   * Prompts the user to pick a real directory on their disk and mounts it
   */
  public async openDirectory(): Promise<{ directoryName: string; files: Record<string, string> } | null> {
    if (!this.isFileSystemAccessSupported()) {
      throw new Error('Your browser does not support the File System Access API. Please use Google Chrome, Microsoft Edge, or a Chromium-based browser.');
    }

    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      // Request readwrite permission explicitly if required
      if (dirHandle.requestPermission) {
        const perm = await dirHandle.requestPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          throw new Error('Read/Write permissions were not granted for the selected directory.');
        }
      }

      this.activeDirectoryHandle = dirHandle;
      this.fileHandlesMap.clear();
      this.fileBufferCache.clear();
      this.fileModificationTimes.clear();

      // Read files recursively
      const loadedFiles: Record<string, string> = {};
      await this.scanDirectory(dirHandle, '', loadedFiles);

      // Start background file watcher
      this.startFileWatcher();

      this.emit({
        type: 'directory-mounted',
        directoryName: dirHandle.name,
        timestamp: Date.now(),
        details: { filesCount: Object.keys(loadedFiles).length }
      });

      return {
        directoryName: dirHandle.name,
        files: loadedFiles
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return null; // User cancelled modal
      }
      throw err;
    }
  }

  /**
   * Recursively traverses directory handles and loads text contents
   */
  private async scanDirectory(
    dirHandle: FileSystemDirectoryHandle,
    currentPath: string,
    outputFiles: Record<string, string>,
    depth = 0
  ): Promise<void> {
    if (depth > 12) return; // Prevent infinite cyclic loops

    for await (const entry of (dirHandle as any).values()) {
      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

      if (entry.kind === 'directory') {
        if (!IGNORED_DIRECTORIES.has(entry.name)) {
          await this.scanDirectory(entry, entryPath, outputFiles, depth + 1);
        }
      } else if (entry.kind === 'file') {
        const ext = entry.name.split('.').pop()?.toLowerCase() || '';
        if (IGNORED_EXTENSIONS.has(ext)) continue;

        try {
          const file = await entry.getFile();
          // Skip large binary or bundle files > 3MB
          if (file.size > 3 * 1024 * 1024) continue;

          // Read text content
          const text = await file.text();
          outputFiles[entryPath] = text;
          this.fileBufferCache.set(entryPath, text);
          this.fileModificationTimes.set(entryPath, file.lastModified);

          this.fileHandlesMap.set(entryPath, {
            path: entryPath,
            name: entry.name,
            handle: entry,
            lastModified: file.lastModified,
            size: file.size,
            isText: true
          });
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  /**
   * Writes content directly to the physical disk file via FileSystemWritableFileStream
   */
  public async writeFile(relativePath: string, content: string): Promise<boolean> {
    if (!this.activeDirectoryHandle) return false;

    const normalizedPath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const entry = this.fileHandlesMap.get(normalizedPath);

    try {
      let targetHandle: FileSystemFileHandle;

      if (entry?.handle) {
        targetHandle = entry.handle;
      } else {
        // Need to traverse / create nested directory path on disk
        targetHandle = await this.getOrCreateFileHandle(normalizedPath);
      }

      const writable = await (targetHandle as any).createWritable();
      await writable.write(content);
      await writable.close();

      // Update in-memory state
      const file = await targetHandle.getFile();
      this.fileBufferCache.set(normalizedPath, content);
      this.fileModificationTimes.set(normalizedPath, file.lastModified);

      this.fileHandlesMap.set(normalizedPath, {
        path: normalizedPath,
        name: normalizedPath.split('/').pop() || 'file',
        handle: targetHandle,
        lastModified: file.lastModified,
        size: file.size,
        isText: true
      });

      this.emit({
        type: 'file-saved',
        path: normalizedPath,
        timestamp: Date.now()
      });

      return true;
    } catch (err) {
      console.error(`[LocalFs] Failed to write ${normalizedPath} to disk:`, err);
      return false;
    }
  }

  /**
   * Creates a new file on local disk
   */
  public async createFile(relativePath: string, initialContent: string = ''): Promise<boolean> {
    return this.writeFile(relativePath, initialContent);
  }

  /**
   * Deletes a file on local disk
   */
  public async deleteFile(relativePath: string): Promise<boolean> {
    if (!this.activeDirectoryHandle) return false;
    const normalizedPath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');

    try {
      const parts = normalizedPath.split('/');
      const fileName = parts.pop()!;
      let currentDir = this.activeDirectoryHandle;

      for (const part of parts) {
        currentDir = await currentDir.getDirectoryHandle(part, { create: false });
      }

      await (currentDir as any).removeEntry(fileName);
      this.fileHandlesMap.delete(normalizedPath);
      this.fileBufferCache.delete(normalizedPath);
      this.fileModificationTimes.delete(normalizedPath);

      this.emit({
        type: 'file-deleted',
        path: normalizedPath,
        timestamp: Date.now()
      });

      return true;
    } catch (err) {
      console.error(`[LocalFs] Failed to delete ${normalizedPath}:`, err);
      return false;
    }
  }

  /**
   * Helper to create or retrieve nested FileSystemFileHandle
   */
  private async getOrCreateFileHandle(relativePath: string): Promise<FileSystemFileHandle> {
    if (!this.activeDirectoryHandle) throw new Error('No active directory mounted');

    const parts = relativePath.split('/');
    const fileName = parts.pop()!;
    let currentDir = this.activeDirectoryHandle;

    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true });
    }

    return await currentDir.getFileHandle(fileName, { create: true });
  }

  /**
   * Periodic File Watcher: Detects if files on disk were changed externally (e.g. git checkout, build)
   */
  private startFileWatcher() {
    if (this.watcherInterval) {
      clearInterval(this.watcherInterval);
    }

    this.watcherInterval = setInterval(async () => {
      if (!this.activeDirectoryHandle) return;

      for (const [path, entry] of this.fileHandlesMap.entries()) {
        try {
          const file = await entry.handle.getFile();
          const knownModified = this.fileModificationTimes.get(path) || 0;

          // External modification detected!
          if (file.lastModified > knownModified + 200) {
            const newContent = await file.text();
            const currentCached = this.fileBufferCache.get(path);

            if (newContent !== currentCached) {
              this.fileBufferCache.set(path, newContent);
              this.fileModificationTimes.set(path, file.lastModified);

              this.emit({
                type: 'file-externally-modified',
                path,
                timestamp: Date.now(),
                details: { newContent }
              });
            }
          }
        } catch {
          // File may have been deleted or moved externally
        }
      }
    }, 1500);
  }

  /**
   * Disconnects and unmounts the active local directory
   */
  public unmountDirectory() {
    if (this.watcherInterval) {
      clearInterval(this.watcherInterval);
      this.watcherInterval = null;
    }

    const prevName = this.activeDirectoryHandle?.name;
    this.activeDirectoryHandle = null;
    this.fileHandlesMap.clear();
    this.fileBufferCache.clear();
    this.fileModificationTimes.clear();

    this.emit({
      type: 'directory-unmounted',
      directoryName: prevName,
      timestamp: Date.now()
    });
  }
}

export const localFileSystemEngine = new LocalFileSystemEngine();
