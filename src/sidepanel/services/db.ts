import Dexie, { type EntityTable } from 'dexie'

// ========== Type Definitions ==========

export interface Project {
  id?: number
  name: string
  updatedAt: number
  isInbox?: boolean // 标记是否为收集箱
  projectType?: 'canvas' | 'markdown'
  fileHandle?: FileSystemHandle
}

export interface CanvasNode {
  id?: number
  projectId: number
  type: 'text' | 'file' | 'link'
  order: number
  text?: string           // Currently displayed text (always points to edited version if exists)
  originalText?: string   // Original captured text (for version comparison)
  editedText?: string     // User's edited version
  hasEdited?: boolean     // True if edited version exists
  fileData?: Blob        // Image binary data (NOT indexed!)
  fileName?: string
  url?: string
  sourceUrl?: string
  sourceIcon?: string
  createdAt: number
}

// ========== Database Definition ==========

class CascadeDB extends Dexie {
  projects!: EntityTable<Project, 'id'>
  nodes!: EntityTable<CanvasNode, 'id'>

  constructor() {
    super('CascadeDB')
    
    // 基础表结构定义
    const schema = {
      projects: '++id, name, updatedAt, isInbox, projectType',
      nodes: '++id, projectId, type, order, createdAt',
    }

    // 版本定义
    this.version(1).stores(schema)
    this.version(2).stores(schema)
    this.version(3).stores(schema).upgrade(tx => {
      return tx.table('projects').toCollection().modify(project => {
        if (!project.projectType) {
          project.projectType = 'canvas'
        }
      })
    })

    // 数据迁移逻辑：如果存在旧的 WebCanvasDB，则迁移数据
    this.on('ready', async () => {
      try {
        const oldDbName = 'WebCanvasDB'
        const exists = await Dexie.exists(oldDbName)
        if (exists) {
          console.log(`[CascadeDB] Found legacy database ${oldDbName}, starting migration...`)
          const oldDb = new Dexie(oldDbName)
          
          // 打开旧数据库并根据之前的结构定义表
          await oldDb.open()
          
          // 检查旧表是否存在
          if (oldDb.tables.some(t => t.name === 'projects') && oldDb.tables.some(t => t.name === 'nodes')) {
            // 迁移 Projects
            const oldProjects = await oldDb.table('projects').toArray()
            const currentProjectsCount = await this.projects.count()
            
            // 只有当新数据库为空（或只有初始 Inbox）时才迁移
            if (oldProjects.length > 0 && currentProjectsCount <= 1) {
              console.log(`[CascadeDB] Migrating ${oldProjects.length} projects...`)
              for (const p of oldProjects) {
                const { id: _oldId, ...projectData } = p
                // 检查是否已存在同名项目或 Inbox
                const existing = await this.projects.where('name').equals(p.name).first()
                if (!existing) {
                  const newProjectId = await this.projects.add(projectData)
                  
                  // 迁移该项目下的 Nodes
                  const oldNodes = await oldDb.table('nodes').where('projectId').equals(p.id).toArray()
                  if (oldNodes.length > 0) {
                    console.log(`[CascadeDB] Migrating ${oldNodes.length} nodes for project: ${p.name}`)
                    for (const n of oldNodes) {
                      const { id: _oldNodeId, ...nodeData } = n
                      nodeData.projectId = newProjectId as number // 关联新项目 ID
                      await this.nodes.add(nodeData)
                    }
                  }
                }
              }
              console.log('[CascadeDB] Migration completed successfully.')
            }
          }
          await oldDb.close()
        }
      } catch (err) {
        console.error('[CascadeDB] Migration failed:', err)
      }
    })
  }
}

export const db = new CascadeDB()

export const VAULT_ROOT_NAME = '___VAULT_ROOT___'

// 暴露到全局用于调试（仅开发环境）
if (typeof window !== 'undefined') {
  (window as any).db = db
}

// ========== Initialization ==========


// 确保 Inbox 存在
export async function ensureInboxExists() {
  const inbox = await db.projects.filter(p => p.isInbox === true).first()
  if (!inbox) {
    console.log('[CascadeDB] Creating Inbox project...')
    await db.projects.add({
      name: '收集箱',
      updatedAt: Date.now(),
      isInbox: true
    })
  }
}

// ========== Helper Functions ==========

export async function addTextNode(projectId: number, text: string, sourceUrl?: string, sourceIcon?: string) {
  try {
    console.log('[CascadeDB] addTextNode called - projectId:', projectId, 'text length:', text.length)

    const maxOrder = await db.nodes.where('projectId').equals(projectId).count()
    console.log('[CascadeDB] maxOrder for new node:', maxOrder)

    const result = await db.nodes.add({
      projectId,
      type: 'text',
      order: maxOrder,
      text,                    // Initially points to original text
      originalText: text,        // Save original on creation
      editedText: undefined,      // No edited version yet
      hasEdited: false,           // Mark as not edited
      sourceUrl,
      sourceIcon,
      createdAt: Date.now(),
    })

    console.log('[CascadeDB] Text node added successfully, ID:', result)
    return result
  } catch (err) {
    console.error('[CascadeDB] Failed to add text node:', err)
    throw err
  }
}

export async function addImageNode(
  projectId: number,
  fileData: Blob,
  fileName: string,
  sourceUrl?: string
) {
  try {
    console.log('[CascadeDB] addImageNode called - projectId:', projectId, 'fileName:', fileName)

    const maxOrder = await db.nodes.where('projectId').equals(projectId).count()
    console.log('[CascadeDB] maxOrder for new node:', maxOrder)

    const result = await db.nodes.add({
      projectId,
      type: 'file',
      order: maxOrder,
      fileData,
      fileName,
      sourceUrl,
      createdAt: Date.now(),
    })

    console.log('[CascadeDB] Image node added successfully, ID:', result)
    return result
  } catch (err) {
    console.error('[CascadeDB] Failed to add image node:', err)
    throw err
  }
}

export async function addLinkNode(
  projectId: number,
  url: string,
  title?: string,
  sourceIcon?: string
) {
  try {
    console.log('[CascadeDB] addLinkNode called - projectId:', projectId, 'url:', url)

    const maxOrder = await db.nodes.where('projectId').equals(projectId).count()
    console.log('[CascadeDB] maxOrder for new node:', maxOrder)

    const result = await db.nodes.add({
      projectId,
      type: 'link',
      order: maxOrder,
      url,
      text: title,
      sourceIcon,
      createdAt: Date.now(),
    })

    console.log('[CascadeDB] Link node added successfully, ID:', result)
    return result
  } catch (err) {
    console.error('[CascadeDB] Failed to add link node:', err)
    throw err
  }
}

export async function updateNodeOrder(nodeId: number, newOrder: number) {
  try {
    console.log('[CascadeDB] updateNodeOrder - nodeId:', nodeId, 'newOrder:', newOrder)
    const result = await db.nodes.update(nodeId, { order: newOrder })
    console.log('[CascadeDB] Node order updated successfully')
    return result
  } catch (err) {
    console.error('[CascadeDB] Failed to update node order:', err)
    throw err
  }
}

export async function reorderNodes(_projectId: number, orderedIds: number[]) {
  try {
    console.log('[CascadeDB] reorderNodes - orderedIds:', orderedIds)
    await db.transaction('rw', db.nodes, async () => {
      await Promise.all(
        orderedIds.map((id, index) =>
          db.nodes.update(id, { order: index })
        )
      )
    })
    console.log('[CascadeDB] Nodes reordered successfully')
  } catch (err) {
    console.error('[CascadeDB] Failed to reorder nodes:', err)
    throw err
  }
}

// ========== Version Management ==========
/**
 * Update text node with version detection
 * - First edit: saves originalText, creates editedText
 * - Subsequent edits: only updates editedText
 * - Always updates 'text' to point to displayed version
 */
export async function updateTextNode(nodeId: number, newContent: string) {
  try {
    console.log('[CascadeDB] updateTextNode - nodeId:', nodeId, 'content length:', newContent.length)

    const node = await db.nodes.get(nodeId)
    if (!node) {
      throw new Error(`Node ${nodeId} not found`)
    }

    const trimmed = newContent.trim()

    // If content hasn't changed, do nothing
    if (node.editedText && trimmed === node.editedText) {
      console.log('[CascadeDB] Content unchanged, skipping update')
      return
    }

    // Version detection
    if (!node.hasEdited) {
      console.log('[CascadeDB] First edit detected')
      // First edit: save original and create edited version
      await db.nodes.update(nodeId, {
        originalText: node.text,
        editedText: trimmed,
        text: trimmed,
        hasEdited: true
      })
    } else {
      console.log('[CascadeDB] Subsequent edit detected')
      // Subsequent edit: only update edited version
      await db.nodes.update(nodeId, {
        editedText: trimmed,
        text: trimmed
      })
    }

    // Return the updated node
    const updatedNode = await db.nodes.get(nodeId)
    console.log('[CascadeDB] Text node updated successfully')
    return updatedNode
  } catch (err) {
    console.error('[CascadeDB] Failed to update text node:', err)
    throw err
  }
}

// ========== Undo/Redo Functions ==========

/**
 * Restore a deleted node back to the database
 * Used for undo functionality
 */
export async function restoreNode(node: Omit<CanvasNode, 'id'>): Promise<number> {
  try {
    console.log('[CascadeDB] restoreNode - type:', node.type, 'projectId:', node.projectId)

    // Add node back to database
    const result = await db.nodes.add(node)

    if (result === undefined) {
      throw new Error('Failed to restore node: returned ID is undefined')
    }

    console.log('[CascadeDB] Node restored successfully, ID:', result)
    return result
  } catch (err) {
    console.error('[CascadeDB] Failed to restore node:', err)
    throw err
  }
}

