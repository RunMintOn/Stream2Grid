import Dexie, { type EntityTable } from 'dexie'

// ========== Type Definitions ==========

export interface Project {
  id?: number
  name: string
  updatedAt: number
}

export interface CanvasNode {
  id?: number
  projectId: number
  type: 'text' | 'file' | 'link'
  order: number
  text?: string
  fileData?: Blob        // Image binary data (NOT indexed!)
  fileName?: string
  url?: string
  sourceUrl?: string
  sourceIcon?: string
  createdAt: number
}

// ========== Database Definition ==========

class WebCanvasDB extends Dexie {
  projects!: EntityTable<Project, 'id'>
  nodes!: EntityTable<CanvasNode, 'id'>

  constructor() {
    super('WebCanvasDB')
    
    this.version(1).stores({
      // ⚠️ IMPORTANT: Do NOT index fileData (Blob) - it will crash the database!
      projects: '++id, name, updatedAt',
      nodes: '++id, projectId, type, order, createdAt',
    })
  }
}

export const db = new WebCanvasDB()

// ========== Helper Functions ==========

export async function addTextNode(projectId: number, text: string, sourceUrl?: string, sourceIcon?: string) {
  const maxOrder = await db.nodes.where('projectId').equals(projectId).count()
  
  return db.nodes.add({
    projectId,
    type: 'text',
    order: maxOrder,
    text,
    sourceUrl,
    sourceIcon,
    createdAt: Date.now(),
  })
}

export async function addImageNode(
  projectId: number,
  fileData: Blob,
  fileName: string,
  sourceUrl?: string
) {
  const maxOrder = await db.nodes.where('projectId').equals(projectId).count()
  
  return db.nodes.add({
    projectId,
    type: 'file',
    order: maxOrder,
    fileData,
    fileName,
    sourceUrl,
    createdAt: Date.now(),
  })
}

export async function addLinkNode(
  projectId: number,
  url: string,
  title?: string,
  sourceIcon?: string
) {
  const maxOrder = await db.nodes.where('projectId').equals(projectId).count()
  
  return db.nodes.add({
    projectId,
    type: 'link',
    order: maxOrder,
    url,
    text: title,
    sourceIcon,
    createdAt: Date.now(),
  })
}

export async function updateNodeOrder(nodeId: number, newOrder: number) {
  return db.nodes.update(nodeId, { order: newOrder })
}

export async function reorderNodes(_projectId: number, orderedIds: number[]) {
  return db.transaction('rw', db.nodes, async () => {
    await Promise.all(
      orderedIds.map((id, index) =>
        db.nodes.update(id, { order: index })
      )
    )
  })
}
