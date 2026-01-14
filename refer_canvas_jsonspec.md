https://jsoncanvas.org/spec/1.0/

这份文档是基于 Obsidian 官方 **JSON Canvas (v1.0)** 规范整理的，专门针对我们的“WebCanvas 导出算法”进行了适配。

掌握这个结构后，我们只需在导出时生成符合此规范的 JSON 文件，Obsidian 就能完美识别你的布局。

### 1. Obsidian Canvas 文件结构 (`.canvas`)

本质上是一个纯 JSON 文件。
**根对象**包含两个核心数组：`nodes`（节点）和 `edges`（连线，MVP阶段可暂为空）。

```json
{
  "nodes": [ /* 节点对象数组 */ ],
  "edges": [ /* 连线对象数组 */ ]
}
```

---

### 2. 节点 (Nodes) 数据结构详解

我们需要用到的主要有三种节点：**Text (文本)**, **File (图片/附件)**, **Link (网页卡片)**。

#### 通用属性 (Generic Attributes)
所有节点都必须包含的基础坐标信息。

| 字段 | 类型 | 说明 | 示例 |
| :--- | :--- | :--- | :--- |
| `id` | string | 唯一 ID (推荐 UUID) | `"n1a2b3c4"` |
| `type` | string | 节点类型 | `"text"`, `"file"`, `"link"` |
| `x` | number | X 轴坐标 (像素) | `0` |
| `y` | number | Y 轴坐标 (像素) | `400` |
| `width` | number | 宽度 | `400` |
| `height` | number | 高度 | `300` |
| `color` | string | (可选) 颜色标记 | `"1"` (红), `"4"` (绿) |

---

#### A. 文本节点 (Text Node)
对应我们侧边栏里的**纯文本**或**文字笔记**。

```json
{
  "id": "node-text-1",
  "type": "text",
  "x": 0, "y": 0, "width": 400, "height": 200,
  "text": "## 这是一个标题\n这里是支持 Markdown 的正文内容。"
}
```

#### B. 文件节点 (File Node) - **最关键**
对应我们侧边栏里拖进去的**图片**。
*   **注意路径：** `file` 字段填写的路径是**相对于 Obsidian 库根目录**的。
*   **配合导出：** 我们的 Zip 包结构必须是 `.canvas` 文件在根目录，图片在 `attachments/` 文件夹里，这样路径才能对上。

```json
{
  "id": "node-image-1",
  "type": "file",
  "x": 420, "y": 0, "width": 400, "height": 300,
  "file": "attachments/image-20231024.png"  // 关键：相对路径
}
```

#### C. 链接节点 (Link Node)
对应我们侧边栏里的**网页书签**。Obsidian 会自动把它渲染成一个带预览图的网页卡片。

```json
{
  "id": "node-link-1",
  "type": "link",
  "x": 0, "y": 250, "width": 400, "height": 400,
  "url": "https://github.com/obsidianmd/jsoncanvas"
}
```

---

### 3. 我们的“列表转网格”导出算法实现 (TypeScript)

这是根据上述规范写的核心转换代码。你可以直接把它用到你的 `exporter.ts` 里。

```typescript
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

// 配置常量
const CONFIG = {
  colCount: 4,          // 一行放4个
  cardWidth: 400,       // 卡片标准宽
  gap: 40,              // 间距
  textHeight: 200,      // 文本卡片高度估算
  imageHeight: 300,     // 图片卡片高度估算
  linkHeight: 400       // 网页卡片高度估算
};

interface ExportNode {
  id: string;
  type: 'text' | 'file' | 'link';
  content: string;      // text内容 或 file文件名 或 url
  blob?: Blob;          // 仅图片有
}

export async function exportToObsidian(projectName: string, nodes: ExportNode[]) {
  const zip = new JSZip();
  const canvasNodes: any[] = [];
  const attachments = zip.folder("attachments"); // 创建附件文件夹

  // 1. 遍历节点，计算坐标并构建 JSON
  nodes.forEach((node, index) => {
    // 简单的网格布局算法
    const colIndex = index % CONFIG.colCount;
    const rowIndex = Math.floor(index / CONFIG.colCount);

    const x = colIndex * (CONFIG.cardWidth + CONFIG.gap);
    const y = rowIndex * (CONFIG.linkHeight + CONFIG.gap); // 简单起见统一用最大高度步进，也可优化为瀑布流

    // 构建 Canvas Node 对象
    const canvasNode: any = {
      id: node.id,
      type: node.type,
      x: x,
      y: y,
      width: CONFIG.cardWidth,
      height: node.type === 'text' ? CONFIG.textHeight : 
              node.type === 'file' ? CONFIG.imageHeight : CONFIG.linkHeight
    };

    // 根据类型填充特定字段
    if (node.type === 'text') {
      canvasNode.text = node.content;
    } else if (node.type === 'link') {
      canvasNode.url = node.content;
    } else if (node.type === 'file') {
      const fileName = node.content; // e.g., "demo.png"
      canvasNode.file = `attachments/${fileName}`; // 核心：指向附件目录
      
      // 将二进制图片塞入 zip 包
      if (node.blob && attachments) {
        attachments.file(fileName, node.blob);
      }
    }

    canvasNodes.push(canvasNode);
  });

  // 2. 生成 .canvas 文件内容
  const canvasData = {
    nodes: canvasNodes,
    edges: [] // 暂时留空
  };

  // 3. 将 .canvas 文件塞入 zip 包
  zip.file(`${projectName}.canvas`, JSON.stringify(canvasData, null, 2));

  // 4. 打包并触发下载
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `${projectName}-export.zip`);
}
```

### 总结
这就是你需要的所有信息：
1.  **JSON 结构**很简单，核心就是 `nodes` 数组。
2.  **图片引用**靠相对路径 `attachments/xxx.png`。
3.  **Zip 包**结构必须把 `.canvas` 放在根目录，图片放在子目录。

有了这个文档，你的 `exporter` 模块应该可以很快写完了。