
/**
 * File System Access API Service
 * Wraps browser native File System Access API for easier use in the application.
 */

/**
 * Request a directory handle from the user.
 * This triggers the browser's directory picker.
 */
export async function requestDirectoryHandle(): Promise<FileSystemDirectoryHandle> {
  try {
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
    });
    return handle;
  } catch (error) {
    console.error('[Cascade FS] Failed to request directory handle:', error);
    throw error;
  }
}

/**
 * Verify if we have permission to access the handle.
 * If not, request it.
 */
export async function verifyPermission(
  handle: FileSystemHandle,
  mode: 'read' | 'readwrite' = 'read'
): Promise<boolean> {
  const options: FileSystemHandlePermissionDescriptor = { mode };

  // Check if permission was already granted
  if ((await handle.queryPermission(options)) === 'granted') {
    return true;
  }

  // Request permission
  if ((await handle.requestPermission(options)) === 'granted') {
    return true;
  }

  return false;
}

/**
 * Read text content from a file.
 */
export async function readFile(
  dirHandle: FileSystemDirectoryHandle,
  filename: string
): Promise<string> {
  try {
    const fileHandle = await dirHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (error) {
    console.error(`[Cascade FS] Failed to read file ${filename}:`, error);
    throw error;
  }
}

/**
 * Write text content to a file.
 * Creates the file if it doesn't exist.
 */
export async function writeFile(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
  content: string
): Promise<void> {
  try {
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  } catch (error) {
    console.error(`[Cascade FS] Failed to write file ${filename}:`, error);
    throw error;
  }
}

/**
 * Create a new empty file.
 */
export async function createFile(
  dirHandle: FileSystemDirectoryHandle,
  filename: string
): Promise<void> {
  await writeFile(dirHandle, filename, '');
}

/**
 * Save an image blob to the 'assets' subdirectory.
 * Creates 'assets' directory if it doesn't exist.
 * Returns the relative path (e.g., "assets/image.png").
 */
export async function saveImage(
  dirHandle: FileSystemDirectoryHandle,
  blob: Blob,
  filename: string
): Promise<string> {
  try {
    // Get or create 'assets' directory
    const assetsHandle = await dirHandle.getDirectoryHandle('assets', { create: true });
    
    // Create file in assets directory
    const fileHandle = await assetsHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();

    return `assets/${filename}`;
  } catch (error) {
    console.error(`[Cascade FS] Failed to save image ${filename}:`, error);
    throw error;
  }
}
