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
const CARD_HEIGHT_TEXT = 120
const CARD_HEIGHT_IMAGE = 200
const CARD_HEIGHT_LINK = 100
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

// ========== Main Export Function ==========

export async function exportToCanvas(projectId: number, projectName: string): Promise<void> {
  console.log('[WebCanvas] Exporting project:', projectName)

  // 1. Fetch all nodes for the project
  const nodes: CanvasNode[] = await db.nodes.where('projectId').equals(projectId).sortBy('order')

  if (nodes.length === 0) {
    alert('画板是空的，无法导出')
    return
  }

  // 2. Convert to Obsidian Canvas format
  const canvasNodes: ObsidianNode[] = nodes.map((node, index: number) => {
    const col = index % COLS
    const row = Math.floor(index / COLS)

    const obsidianNode: ObsidianNode = {
      id: `node-${node.id}`,
      type: mapTypeToObsidian(node.type),
      x: col * (CARD_WIDTH + GAP),
      y: row * (estimateHeight(node) + GAP),
      width: CARD_WIDTH,
      height: estimateHeight(node),
    }

    // Add type-specific fields
    if (node.type === 'text') {
      obsidianNode.text = node.text || ''
    } else if (node.type === 'file') {
      obsidianNode.file = `attachments/${node.fileName || 'image.png'}`
    } else if (node.type === 'link') {
      obsidianNode.url = node.url || ''
      obsidianNode.text = node.text || node.url || ''
    }

    return obsidianNode
  })

  // 3. Create Canvas JSON
  const canvas: ObsidianCanvas = {
    nodes: canvasNodes,
    edges: [],
  }

  const json = JSON.stringify(canvas, null, 2)
  console.log('[WebCanvas] Canvas JSON generated:', json.length, 'bytes')

  // 4. Create ZIP
  const zip = new JSZip()

  // Add .canvas file
  zip.file(`${projectName}.canvas`, json)

  // Add image attachments
  const attachmentsFolder = zip.folder('attachments')
  const imageNodes = nodes.filter((node: CanvasNode) => node.type === 'file' && node.fileData)
  
  for (const node of imageNodes) {
    if (node.fileData) {
      const fileName = node.fileName || `image-${node.id}.png`
      attachmentsFolder!.file(fileName, node.fileData)
    }
  }

  // 5. Generate and download ZIP
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)

  // Trigger download
  const a = document.createElement('a')
  a.href = url
  a.download = `${projectName}.zip`
  a.click()

  // Cleanup
  URL.revokeObjectURL(url)
  console.log('[WebCanvas] Export complete:', projectName)
}
