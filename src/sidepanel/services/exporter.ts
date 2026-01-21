import JSZip from 'jszip'
import { db, type CanvasNode } from './db'

// @ts-ignore - Suppress warnings about PromiseExtended types

// ========== Obsidian Canvas Types ==========

interface ObsidianNode {
  id: string
  type: 'text' | 'file' | 'link'
  x: number
  y: number
  width: number
  height: number
  text?: string
  file?: string
  url?: string
  color?: string
}

interface ObsidianEdge {
  id: string
  fromNode: string
  fromSide?: 'top' | 'right' | 'bottom' | 'left'
  fromEnd?: 'none' | 'arrow'
  toNode: string
  toSide?: 'top' | 'right' | 'bottom' | 'left'
  toEnd?: 'none' | 'arrow'
  color?: string
  label?: string
}

interface ObsidianCanvas {
  nodes: ObsidianNode[]
  edges: ObsidianEdge[]
}

// ========== Constants ==========

const CARD_WIDTH = 400
const CARD_HEIGHT_TEXT = 200
const CARD_HEIGHT_IMAGE = 300
const CARD_HEIGHT_LINK = 150
const GAP = 50
const COLS = 4

// ========== Helper Functions ==========

function estimateHeight(node: CanvasNode): number {
  if (node.type === 'text') return CARD_HEIGHT_TEXT
  if (node.type === 'file') return CARD_HEIGHT_IMAGE
  if (node.type === 'link') return CARD_HEIGHT_LINK
  return CARD_HEIGHT_TEXT
}

function mapTypeToObsidian(type: 'text' | 'file' | 'link'): 'text' | 'file' | 'link' {
  return type
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * CRITICAL FIX: Normalize line endings to Unix format (\n)
 * Windows uses \r\n which can cause Obsidian parsing issues
 */
function normalizeTextContent(text: string): string {
  if (!text) return ''
  // Replace Windows line endings with Unix line endings
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

/**
 * Calculate total height needed for each row in a grid layout
 */

// ========== Main Export Function ==========

export async function exportToCanvas(projectId: number, projectName: string): Promise<void> {
  console.log('[Cascade] Exporting project:', projectName)

  // 1. Fetch all nodes for the project
  const nodes: CanvasNode[] = await db.nodes.where('projectId').equals(projectId).sortBy('order')

  if (nodes.length === 0) {
    alert('画板是空的，无法导出')
    return
  }

  console.log('[Cascade DEBUG] Total nodes fetched:', nodes.length)

  // 2. Convert to Obsidian Canvas format with improved layout
  const canvasNodes: ObsidianNode[] = nodes.map((node, index: number) => {
    const col = index % COLS
    const row = Math.floor(index / COLS)
    
    // Calculate X and Y with proper spacing
    const x = Math.round(col * (CARD_WIDTH + GAP))
    const y = Math.round(row * (CARD_HEIGHT_TEXT + GAP))

    const obsidianNode: ObsidianNode = {
      id: generateUUID(),
      type: mapTypeToObsidian(node.type),
      x: x,
      y: y,
      width: CARD_WIDTH,
      height: estimateHeight(node),
    }

    // Add type-specific fields
    if (node.type === 'text') {
      // CRITICAL FIX: Normalize line endings
      const normalizedText = normalizeTextContent(node.text || '')
      obsidianNode.text = normalizedText
      
      console.log('[Cascade DEBUG] Text node:', JSON.stringify({
        id: obsidianNode.id,
        textLength: normalizedText.length,
        hasCarriageReturn: normalizedText.includes('\r'),
        textPreview: normalizedText.substring(0, 50) + '...',
        x: x,
        y: y
      }))
    } else if (node.type === 'file') {
      obsidianNode.file = `attachments/${node.fileName || 'image.png'}`
      console.log('[Cascade DEBUG] File node:', JSON.stringify({
        id: obsidianNode.id,
        file: obsidianNode.file,
        fileName: node.fileName,
        x: x,
        y: y
      }))
    } else if (node.type === 'link') {
      // Link nodes should ONLY have 'url' field according to JSON Canvas v1.0 spec
      // Do NOT add 'text' field - it will cause Obsidian display issues
      obsidianNode.url = node.url || ''
      console.log('[Cascade DEBUG] Link node:', JSON.stringify({
        id: obsidianNode.id,
        url: obsidianNode.url,
        x: x,
        y: y
      }))
    }

    return obsidianNode
  })

  // 3. Create Canvas JSON
  const canvas: ObsidianCanvas = {
    nodes: canvasNodes,
    edges: [],
  }

  const json = JSON.stringify(canvas, null, 2)
  console.log('[Cascade] Canvas JSON generated:', json.length, 'bytes')
  
  // CRITICAL: Verify no carriage returns in JSON
  if (json.includes('\r')) {
    console.error('[Cascade ERROR] JSON still contains \r characters!')
  } else {
    console.log('[Cascade] JSON is clean (no \r characters)')
  }
  
  console.log('[Cascade DEBUG] Generated JSON:', json)
  
  // Also copy to clipboard for easy inspection
  try {
    await navigator.clipboard.writeText(json)
    console.log('[Cascade] JSON copied to clipboard - you can paste it elsewhere to inspect')
  } catch (err) {
    console.warn('[Cascade] Could not copy to clipboard:', err)
  }

  // 4. Create ZIP
  const zip = new JSZip()

  // Add .canvas file
  zip.file(`${projectName}.canvas`, json)

  // Add image attachments
  const attachmentsFolder = zip.folder('attachments')
  const imageNodes = nodes.filter((node: CanvasNode) => node.type === 'file' && node.fileData)
  
  console.log('[Cascade DEBUG] Image nodes to add:', imageNodes.length)
  
  for (const node of imageNodes) {
    if (node.fileData) {
      const fileName = node.fileName || `image-${node.id}.png`
      attachmentsFolder!.file(fileName, node.fileData)
      console.log('[Cascade DEBUG] Added image to ZIP:', fileName, 'size:', node.fileData.size, 'bytes')
    }
  }

  // 5. Generate and download ZIP
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)

  console.log('[Cascade DEBUG] ZIP blob size:', blob.size, 'bytes')
  
  // Additional ZIP verification
  const zipContent = await zip.generateAsync({ type: 'string' })
  console.log('[Cascade DEBUG] ZIP contains .canvas file:', zipContent.includes(projectName + '.canvas'))

  // Trigger download
  const a = document.createElement('a')
  a.href = url
  a.download = `${projectName}.zip`
  a.click()

  // Cleanup
  URL.revokeObjectURL(url)
  console.log('[Cascade] Export complete:', projectName)
}
