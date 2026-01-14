这是第一部分开发文档。
作为你的技术合伙人，我将这部分侧重于 **「产品需求定义 (PRD)」** 与 **「高层技术架构」**。这部分旨在明确“我们要做什么”以及“用什么工具做”，确保地基稳固。

---

# 项目代号：WebCanvas (Obsidian Browser Scout)
## 核心开发文档 - 第一部分：产品定义与架构选型

### 1. 项目愿景与第一性原理
*   **核心痛点**：网页碎片化信息采集与非线性整理之间的断层。现有的剪藏工具是线性的（列表/文档），而人的思考是网状的（画布）。
*   **产品定位**：浏览器中的 **“第二缓冲区”**。
    *   它不是一个独立的笔记软件（SaaS），而是 **Obsidian 生态在浏览器端的“前哨站”**。
    *   **Local-First**：无账户体系，数据全本地，隐私优先。
*   **核心隐喻**：它就像你书桌旁的一张无限大的草稿纸，随时可以把网页上的东西剪下来贴上去，最后整理好塞进你的档案柜（Obsidian）。

---

### 2. 用户故事与核心功能 (MVP 范围)

#### 2.1 模块一：项目/画板管理 (Workspace Dashboard)
*   **需求**：用户需要隔离不同的调研任务（如“装修灵感”与“技术调研”不能混在一起）。
*   **功能点**：
    *   **画板列表**：侧边栏首页展示所有已创建的画板（类似文件夹）。
    *   **CRUD 操作**：新建、重命名、删除画板。
    *   **状态记忆**：记住上次关闭时所在的画板位置和缩放比例。

#### 2.2 模块二：无限画布编辑器 (Canvas Editor)
*   **需求**：用户需要在一个二维平面上自由摆放素材，并建立视觉联系。
*   **功能点**：
    *   **无限平移/缩放**：支持鼠标滚轮缩放、空格拖拽平移。
    *   **节点渲染**：支持渲染 纯文本、图片、网页链接卡片 三种核心形态。
    *   **连线功能**：虽然 MVP 重点在采集，但需支持基本的节点连线（Edge），对齐 Obsidian Canvas 标准。
    *   **一键整理 (Auto-Layout)**：提供按钮，将散乱拖入的节点按网格或树状自动排列。

#### 2.3 模块三：智能采集系统 (Smart Capture)
*   **需求**：用户希望“拖拽即所得”，减少点击和复制粘贴的步骤。
*   **功能点**：
    *   **文本拖拽**：选中网页文字 -> 拖入 -> 生成文本卡片（自动附带 Source URL）。
    *   **图片拖拽**：拖入网页图片 -> 自动下载并转存为 Blob -> 生成图片卡片。
    *   **链接拖拽**：拖拽地址栏或网页内的 `<a>` 标签 -> 生成带有 OpenGraph（标题/简介/封面）的链接卡片。

#### 2.4 模块四：Obsidian 桥接 (The Bridge)
*   **需求**：用户最终需要将整理好的成果永久归档。
*   **功能点**：
    *   **`.canvas` 导出**：将当前画板状态序列化为 Obsidian 标准 JSON。
    *   **资源打包**：生成 `.zip` 包，内含 `.canvas` 文件及 `attachments/` 文件夹（存放图片）。

---

### 3. 技术架构与选型 (Architecture Stack)

为了实现“健壮、可扩展”，我们采用现代化的前端工程标准。

#### 3.1 核心技术栈
| 模块 | 选型 | 决策理由 (Trade-offs) |
| :--- | :--- | :--- |
| **构建框架** | **React 18 + Vite + CRXJS** | 现代插件开发的标准配置，HMR (热更新) 体验好，生态最丰富。 |
| **画布引擎** | **React Flow** (v11/v12) | **核心决策**。其数据模型 (Nodes/Edges) 与 Obsidian Canvas 结构高度同构；组件化定制能力强；社区活跃。 |
| **状态/数据存储** | **Dexie.js (IndexedDB)** | `localStorage` (5MB) 存不下图片。Dexie 封装了 IndexedDB，支持存储二进制 Blob，性能极高。 |
| **样式方案** | **Tailwind CSS** | 原子化 CSS，方便在 Shadow DOM 中通过预处理实现样式隔离，开发速度快。 |
| **打包工具** | **JSZip** | 纯前端生成 Zip 包，解决多文件导出问题。 |
| **布局算法** | **ELKjs** 或 **Dagre** | 用于实现“一键整理”功能，处理节点自动排版。 |

#### 3.2 数据流向架构图 (Data Flow)

```mermaid
graph TD
    A[网页 Content Script] -->|Drag Event (DataTransfer)| B(Side Panel 接收层)
    
    subgraph Browser Side Panel
        B -->|解析 HTML/URL| C[采集预处理 Service]
        C -->|生成 Node Object| D[React Flow Store (Zustand)]
        D -->|实时渲染| E[Canvas 画布 UI]
        D -->|Auto-Save| F[IndexedDB (Dexie)]
    end
    
    subgraph Export Action
        F -->|读取所有数据| G[Export Service]
        G -->|1. 转换 JSON 格式| H[生成 .canvas 文件]
        G -->|2. 读取图片 Blob| I[生成 attachments 目录]
        H & I --> J[JSZip 打包]
        J --> K[下载 .zip 到本地]
    end
```

---

### 4. 关键风险与应对策略

1.  **图片防盗链 (Hotlinking/CORS)**
    *   *问题*：直接在侧边栏用 `img src="原网链接"` 可能会裂图。
    *   *方案*：后台（Background Script）负责 fetch 图片资源并转为 Blob/Base64 存入 IndexedDB。侧边栏只显示本地 Blob URL。

2.  **Obsidian 样式兼容性**
    *   *问题*：浏览器里的卡片长宽可能和 Obsidian 里的默认字体/边距不一致。
    *   *方案*：在 CSS 层面尽量复刻 Obsidian 的默认主题变量（如 `--canvas-color-1`），保证“所见即所得”。

3.  **侧边栏生命周期**
    *   *问题*：浏览器侧边栏关闭后，内存即销毁。
    *   *方案*：严格执行 **“操作即保存”** 策略。每一次节点移动、添加，都触发 IndexedDB 的 update，确保意外关闭不丢失数据。

---

**（第一部分结束。请确认对上述架构选型无异议，接下来我将输出第二部分：详细的数据结构设计与核心代码逻辑实现，这是落地的关键。）**

这是开发文档的第二部分。
在第一部分明确了“做什么”之后，这一部分我们将深入 **“怎么做”**。重点在于**数据结构设计**（确保与 Obsidian 兼容）和**核心功能逻辑**（拖拽与转换）。

---

## 核心开发文档 - 第二部分：数据模型与核心逻辑

### 5. 数据结构设计 (Data Schema)

为了保证“导出即用”，我们的内部数据模型必须以 Obsidian Canvas 的规范为“北极星”，同时兼顾 React Flow 的运行需求。

#### 5.1 数据库 Schema (IndexedDB / Dexie)

我们需要两个核心表：`projects` (画板/文件夹) 和 `nodes` (具体的卡片)。

```typescript
// db.ts (Dexie Schema)

interface Project {
  id: string;          // UUID
  name: string;        // 画板名称 (e.g., "AI 调研")
  createdAt: number;
  updatedAt: number;
  viewport: { x: number, y: number, zoom: number }; // 记忆上次查看的位置
}

interface CanvasNode {
  id: string;          // UUID (对应 Obsidian 的 id)
  projectId: string;   // 关联的画板 ID
  type: 'text' | 'file' | 'link' | 'group'; // 对应 Obsidian 的节点类型
  
  // 坐标与尺寸 (React Flow 格式)
  position: { x: number, y: number };
  width: number;
  height: number;
  
  // 内容数据
  text?: string;       // 文字内容 / Markdown
  fileData?: Blob;     // 图片/文件的二进制数据 (核心：直接存 Blob)
  fileName?: string;   // 文件名 (e.g., "image-123.png")
  url?: string;        // 链接节点的 URL
  
  // 元数据 (用于溯源)
  sourceUrl?: string;  // 来源网页 URL
  color?: string;      // 节点颜色 (对应 Obsidian 的 color 1-6)
}

interface CanvasEdge {
  id: string;
  projectId: string;
  source: string;      // 起点 Node ID
  target: string;      // 终点 Node ID
  sourceSide?: 'top'|'right'|'bottom'|'left'; // 锚点方向
  targetSide?: 'top'|'right'|'bottom'|'left';
}
```

#### 5.2 核心难点：数据转换适配器 (The Adapter)

我们需要一个工具函数，将上述 IndexedDB 的数据转换为 Obsidian Canvas 的 JSON 格式。

**Obsidian Canvas JSON 规范参考：**
```json
{
  "nodes": [
    {
      "id": "node-1",
      "type": "text",
      "text": "Hello World",
      "x": 0, "y": 0, "width": 250, "height": 100
    },
    {
      "id": "node-2",
      "type": "file",
      "file": "attachments/image.png",  <-- 注意这里是相对路径
      "x": 300, "y": 0, "width": 400, "height": 300
    }
  ],
  "edges": []
}
```

---

### 6. 核心功能实现逻辑

#### 6.1 智能拖拽系统 (Drag & Drop Logic)

这是用户体验的核心。我们需要处理从“外部网页”拖拽到“侧边栏插件”的整个链路。

*   **挑战**：浏览器默认的拖拽行为可能无法携带足够的信息（比如图片的原始 URL 或 Base64）。
*   **解决方案**：双层拦截。

**A. Content Script (注入到源网页的脚本):**
当用户开始拖拽时，尽可能多地注入数据到 `dataTransfer` 对象中。
```javascript
// content-script.js
document.addEventListener('dragstart', (event) => {
  const target = event.target;
  
  // 构造一个标准的数据包
  const payload = {
    sourceUrl: window.location.href,
    sourceTitle: document.title,
    type: 'unknown',
    content: null
  };

  if (target.tagName === 'IMG') {
    payload.type = 'image';
    payload.src = target.src;
  } else if (target.tagName === 'A') {
    payload.type = 'link';
    payload.href = target.href;
    payload.text = target.innerText;
  } else {
    // 默认处理选中的文本
    const selection = window.getSelection().toString();
    if (selection) {
      payload.type = 'text';
      payload.content = selection;
    }
  }

  // 使用自定义 MIME type 传递数据，方便侧边栏识别
  event.dataTransfer.setData('application/webcanvas-payload', JSON.stringify(payload));
});
```

**B. Side Panel (接收端):**
```javascript
// DropZone.tsx (Side Panel Component)
const onDrop = async (event) => {
  event.preventDefault();
  
  // 1. 尝试获取我们自定义的数据包
  const rawData = event.dataTransfer.getData('application/webcanvas-payload');
  
  // 2. 计算拖拽释放点在 React Flow 画布中的坐标
  const position = reactFlowInstance.screenToFlowPosition({
    x: event.clientX,
    y: event.clientY,
  });

  if (rawData) {
    const payload = JSON.parse(rawData);
    // 3. 根据 payload.type 创建不同的节点
    await createNodeFromPayload(payload, position);
  } else {
    // Fallback: 处理系统级拖拽（如直接拖拽本地文件）
  }
};
```

#### 6.2 图片持久化处理 (Image Handling)

**痛点**：拖入图片如果是 URL，可能受防盗链保护无法显示；如果是 Base64，由于体积过大，会卡死 React Flow。

**处理流程**：
1.  **Drop 事件触发**：获取图片 URL。
2.  **Background Fetch**：在 Background Service Worker 中发起 `fetch(url)` 请求（因为 Background 权限更高，可以配置 CORS 规则）。
3.  **Blob 存储**：将获取到的 Response 转为 `Blob`。
4.  **IndexedDB 写入**：将 Blob 存入 Dexie 数据库，生成一个唯一的 `fileId`。
5.  **前端渲染**：
    *   在 React Flow 的 ImageNode 组件中，使用 `URL.createObjectURL(blob)` 生成临时的预览链接。
    *   **注意**：组件销毁时要调用 `URL.revokeObjectURL` 释放内存。

#### 6.3 导出打包逻辑 (The Exporter)

当用户点击“导出到 Obsidian”时：

1.  **准备阶段**：从 IndexedDB 拉取当前 Project 下的所有 Nodes。
2.  **构建 Canvas JSON**：
    *   遍历 Nodes。
    *   如果是图片节点：将 `file` 字段设为 `attachments/${node.fileName}`。
    *   如果是文本节点：直接映射。
3.  **构建附件**：
    *   遍历所有图片节点，从 IndexedDB 读取 Blob 数据。
4.  **Zip 打包 (JSZip)**：
    ```javascript
    const zip = new JSZip();
    // 添加主文件
    zip.file(`${projectName}.canvas`, JSON.stringify(canvasJson));
    // 添加附件文件夹
    const imgFolder = zip.folder("attachments");
    for (const img of images) {
       imgFolder.file(img.fileName, img.blob);
    }
    // 生成下载
    const content = await zip.generateAsync({type: "blob"});
    saveAs(content, `${projectName}.zip`);
    ```

---

### 7. 项目目录结构推荐

```
src/
├── manifest.json
├── background/
│   └── service-worker.ts   // 处理图片下载、跨域请求
├── content/
│   └── drag-listener.ts    // 注入网页，增强拖拽数据
├── sidepanel/
│   ├── components/
│   │   ├── Canvas/         // React Flow 相关
│   │   │   ├── CustomNodes/
│   │   │   │   ├── TextNode.tsx
│   │   │   │   ├── ImageNode.tsx
│   │   │   │   └── LinkNode.tsx
│   │   │   └── FlowEditor.tsx
│   │   ├── Dashboard/      // 画板列表页
│   │   └── Layout/
│   ├── hooks/
│   │   ├── useAutoSave.ts  // 监听变化自动写入 DB
│   │   └── useDragDrop.ts
│   ├── services/
│   │   ├── db.ts           // Dexie 数据库实例
│   │   ├── exporter.ts     // 导出为 .canvas + zip 逻辑
│   │   └── parser.ts       // 网页元数据解析
│   └── App.tsx
└── shared/
    ├── types.ts            // 全局 TS 类型定义
    └── utils.ts
```

---

### 8. 开发路线图 (MVP Execution Plan)

为了不陷入细节泥潭，我们分阶段推进：

*   **Phase 1: 骨架搭建 (Week 1)**
    *   配置 Vite + CRXJS 环境。
    *   跑通 Side Panel 显示。
    *   集成 React Flow，实现最基本的添加/删除节点。
*   **Phase 2: 数据闭环 (Week 2)**
    *   引入 Dexie.js。
    *   实现 Side Panel 关闭后，再次打开能恢复画布状态。
*   **Phase 3: 拖拽与采集 (Week 3)**
    *   实现 Content Script 里的 `dragstart` 增强逻辑。
    *   重点攻克 **图片跨域下载与 Blob 存储** 这一难点。
*   **Phase 4: 导出与交付 (Week 4)**
    *   编写转换算法，生成符合 Obsidian 标准的 JSON。
    *   实现 JSZip 打包下载。
    *   UI 美化 (Tailwind)。

---

### 合伙人结语

这份文档不仅是代码指南，更是我们的**战略地图**。它确保了我们从一开始就走在“架构清晰、可扩展”的道路上。

**建议下一步：**
如果你准备好了，我们可以先初始化项目仓库，搭建基础的 Vite + React Flow 环境。你会发现，一旦看到那个网格背景的画布出现在浏览器侧边栏，那种成就感是巨大的。