import { useEffect, useState, useRef, useCallback } from 'react';
import { BlockNoteViewRaw } from '@blocknote/react';
import { useCreateBlockNote } from '@blocknote/react';
import '@blocknote/react/style.css';
import type { Project } from '../../services/db';
import { saveImage } from '../../services/fs';

interface LocalMDViewProps {
  fileHandle: FileSystemFileHandle;
  project: Project;
}

export default function LocalMDView({ fileHandle, project: _project }: LocalMDViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create editor instance
  const editor = useCreateBlockNote();

  // Load file content
  useEffect(() => {
    let mounted = true;

    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const file = await fileHandle.getFile();
        const text = await file.text();
        
        if (!mounted) return;

        const blocks = await editor.tryParseMarkdownToBlocks(text);
        editor.replaceBlocks(editor.document, blocks);
        
        setLoading(false);
      } catch (err) {
        console.error('[WebCanvas] Failed to load local markdown:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load file');
          setLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      mounted = false;
    };
  }, [fileHandle, editor]);

  // Listen for drop events from DropZone
  useEffect(() => {
    const handleInsert = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log('[LocalMDView] Received insert event:', detail);

      if (!editor) return;

      // Insert at the end of document
      const targetBlock = editor.document[editor.document.length - 1];

      try {
        if (detail.type === 'text') {
          editor.insertBlocks(
            [{ content: detail.content }],
            targetBlock,
            'after'
          );
        } else if (detail.type === 'link') {
           // Insert as text with link
           editor.insertBlocks(
            [{ 
              content: [
                {
                  type: 'link',
                  href: detail.sourceUrl,
                  content: detail.sourceTitle || detail.content
                }
              ]
            }],
            targetBlock,
            'after'
          );
        } else if (detail.type === 'image') {
          // Save image to assets
          const filename = detail.fileName || `image-${Date.now()}.png`;
          // We need directory handle. fileHandle is a FileHandle.
          // We can't get parent directory from FileHandle easily in standard API?
          // Actually, we can't. We need the directory handle.
          // But we only passed fileHandle to this component.
          // We need to pass directoryHandle or project.fileHandle (which is directory handle in DB).
          
          // Wait, in App.tsx:
          // fileHandle={currentProject.fileHandle as FileSystemFileHandle}
          // But currentProject.fileHandle in DB is the ROOT directory handle (if it's the Vault Root project).
          // But for a specific project, we created a file handle?
          // In ProjectList.tsx:
          // fileHandle: fileHandle as any (which is the FileHandle of the .md file)
          
          // So we DON'T have the directory handle here to save assets!
          // We need the directory handle to save assets.
          
          // We should pass the Root Directory Handle to LocalMDView?
          // Or we should store the Root Handle in the project too?
          // Or we fetch the Vault Root project here?
          
          // Let's fetch Vault Root project to get the directory handle.
          // We can import db and fetch it.
          
          const vault = await import('../../services/db').then(m => m.db.projects.where('name').equals('___VAULT_ROOT___').first());
          if (vault && vault.fileHandle) {
             const rootHandle = vault.fileHandle as FileSystemDirectoryHandle;
             const assetPath = await saveImage(rootHandle, detail.content, filename);
             
             // Insert image block
             // BlockNote image block expects a URL.
             // For local files, we can use a relative path?
             // BlockNote might not support relative paths for display unless we handle it.
             // But for Markdown, it's fine.
             // To display it in editor, we might need a blob URL?
             // But we want to save the relative path in the markdown file.
             
             // BlockNote stores state.
             // If we set 'src' to 'assets/foo.png', BlockNote tries to load it.
             // It won't load from local FS without help.
             // We might need a custom file handling logic in BlockNote or just use Blob URL for display and swap on save?
             // Or we just insert it and let it be broken image for now?
             // No, that's bad UX.
             
             // Better: Create a Blob URL for display.
             // But when saving, we want 'assets/foo.png'.
             // BlockNote's `blocksToMarkdownLossy` will use the src.
             
             // We can use the Blob URL for now.
             // But we need to ensure it saves as relative path.
             // This is tricky with BlockNote out of the box.
             
             // For V1, let's just try to save it and see.
             // If we use `saveImage`, it returns `assets/filename`.
             // If we put that in src, it won't render.
             
             // Workaround:
             // We can't easily make BlockNote render local relative paths without a custom schema or file handler.
             // For V1, maybe we just insert a text block saying "![Image](assets/...)"?
             // Or we use a Blob URL and don't worry about the markdown output for a second (it will save as blob:...).
             // That's bad for the file.
             
             // Correct approach:
             // Use Blob URL for the block.
             // Hook into the markdown serializer to convert Blob URL to relative path?
             // Or just accept that V1 might have this limitation.
             
             // Let's try to use the relative path. If it doesn't render, at least the data is correct.
             // Actually, we can try to read the file we just saved and get a URL?
             // No, local file URLs are not exposed.
             
             // Let's use the Blob URL for the editor.
             // And when saving (in handleSave), we replace Blob URLs with relative paths?
             // That requires parsing the markdown or blocks.
             
             // Let's just insert the image block with the relative path for now.
             // It might show broken image icon, but the text is correct.
             // User can see it in Typora.
             
             editor.insertBlocks(
              [{
                type: 'image',
                props: {
                  url: assetPath,
                  name: filename
                }
              }],
              targetBlock,
              'after'
             );
          } else {
             console.error('Vault root not found');
          }
        }
        
        // Trigger save
        handleChange();
      } catch (err) {
        console.error('Failed to insert content:', err);
      }
    };

    window.addEventListener('webcanvas-insert-markdown', handleInsert);
    return () => window.removeEventListener('webcanvas-insert-markdown', handleInsert);
  }, [editor, handleChange]);

  // Save handler
  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      const markdown = await editor.blocksToMarkdownLossy(editor.document);
      
      const writable = await fileHandle.createWritable();
      await writable.write(markdown);
      await writable.close();
      
      setIsSaving(false);
    } catch (err) {
      console.error('[WebCanvas] Failed to save local markdown:', err);
      // Optional: Show error toast or indicator
      setIsSaving(false);
    }
  }, [fileHandle, editor]);

  // Debounced change handler
  const handleChange = useCallback(() => {
    if (loading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 500);
  }, [handleSave, loading]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-slate-500 text-sm">Loading {fileHandle.name}...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">Error loading file</p>
          <p className="text-slate-600 text-sm mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white flex flex-col relative group">
      {/* Status Indicator */}
      <div className="absolute top-2 right-4 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <span className={`text-xs px-2 py-1 rounded-full ${
          isSaving ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
        }`}>
          {isSaving ? 'Saving...' : 'Saved'}
        </span>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <BlockNoteViewRaw 
          editor={editor} 
          onChange={handleChange}
          theme="light"
          className="min-h-full py-8"
        />
      </div>
    </div>
  );
}
