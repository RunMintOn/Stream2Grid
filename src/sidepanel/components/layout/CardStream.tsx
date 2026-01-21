import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../services/db'
import TextCard from '../cards/TextCard'
import ImageCard from '../cards/ImageCard'
import LinkCard from '../cards/LinkCard'
import { useUndo } from '../../contexts/UndoContext'

interface CardStreamProps {
  projectId: number
  onDelete: (nodeId: number) => Promise<void>
}

export default function CardStream({ projectId, onDelete }: CardStreamProps) {
  const nodes = useLiveQuery(
    () => db.nodes.where('projectId').equals(projectId).sortBy('order'),
    [projectId]
  )
  const { setDeletedNode, showUndo } = useUndo()

  // Debug: Log when nodes change
  console.log('[Cascade CardStream] projectId:', projectId, 'nodes:', nodes, 'nodes.length:', nodes?.length || 0)

  const handleDelete = async (nodeId: number) => {
    // Get the complete node data before deleting
    const node = await db.nodes.get(nodeId)
    if (!node) {
      console.error('[Cascade CardStream] Node not found:', nodeId)
      return
    }

    // Save node data for undo
    setDeletedNode(node)
    showUndo()

    // Perform deletion
    await onDelete(nodeId)
  }

  if (nodes === undefined) {
    return (
      <div className="p-4 text-slate-500 text-center">
        加载中...
      </div>
    )
  }

  return (
    <div className="px-5 py-4">
      {nodes.length === 0 ? (
        <div className="text-center text-slate-500 py-12">
          <div className="text-4xl mb-4">📋</div>
          <p className="mb-2">还没有内容</p>
          <p className="text-sm">从网页拖拽文字、图片或链接到这里</p>
        </div>
      ) : (
        <div className="space-y-3">
          {nodes.map((node) => {
            switch (node.type) {
                 case 'text':
                    return (
                        <TextCard
                          key={node.id}
                          id={node.id!}
                          text={node.text || ''}
                          originalText={node.originalText}
                          sourceUrl={node.sourceUrl}
                          sourceIcon={node.sourceIcon}
                          onDelete={() => handleDelete(node.id!)}
                        />
                    )
                 case 'file':
                   return (
                      <ImageCard
                        key={node.id}
                        id={node.id!}
                        fileData={node.fileData}
                        fileName={node.fileName || 'image.png'}
                        sourceUrl={node.sourceUrl}
                        onDelete={() => handleDelete(node.id!)}
                      />
                   )
                 case 'link':
                   return (
                      <LinkCard
                        key={node.id}
                        id={node.id!}
                        url={node.url || ''}
                        title={node.text}
                        sourceIcon={node.sourceIcon}
                        onDelete={() => handleDelete(node.id!)}
                      />
                   )
                 default:
                   return null
               }
          })}
        </div>
      )}
    </div>
  )
}
