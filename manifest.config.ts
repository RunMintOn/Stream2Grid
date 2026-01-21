import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Cascade',
  version: pkg.version,
  description: 'Collect web content and export to Obsidian Canvas',
  icons: {
    48: 'public/icon-48.png',
    128: 'public/icon-128.png',
  },
  action: {
    default_icon: {
      48: 'public/icon-48.png',
    },
    default_title: 'Open Cascade',
  },
  permissions: [
    'sidePanel',
    'storage',
    'activeTab',
  ],
  host_permissions: [
    'https://*/*',
    'http://*/*',
  ],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  content_scripts: [
    {
      js: ['src/content/drag-listener.ts'],
      matches: ['https://*/*', 'http://*/*'],
      run_at: 'document_idle',
    },
  ],
})
