这是修改后的**最终版开发文档（V2.0）**。

这份文档彻底摒弃了“浏览器端画布”的重型方案，转向了**“流式采集 + 网格导出”**的轻量化高效率架构。所有的 UI/UX 细节（折叠、只读、撤销）均已整合进本文。

---

# 项目代号：WebCanvas (Obsidian Scout)
## 开发白皮书 V2.0 - 核心架构与逻辑规范

### 1. 产品核心范式 (The Paradigm Shift)

*   **旧思路**：在浏览器侧边栏复刻一个 Canvas 画板。
    *   *问题*：空间拥挤，操作繁琐，认知负荷高。
*   **新思路 (Current)**：**采集流 (Stream) -> 知识网格 (Grid)**。
    *   **浏览器端**：极简的垂直列表（Pinterest/Edge Collection 风格）。用户只负责“扔进来”和“简单排序”。
    *   **Obsidian 端**：导出的瞬间，通过算法将列表自动“升维”为二维网格布局，供用户在 Obsidian 中进行深度整理。

---

### 2. 技术栈 (Tech Stack - Revised)

我们做了一次大幅度的“技术减法”，移除了图形渲染引擎，增加了拖拽排序库。

| 模块 | 选型 | 说明 |
| :--- | :--- | :--- |
| **框架** | **React 18 + Vite** | 标准前端基座。 |
| **构建目标** | **Chrome Extension (CRXJS)** | Manifest V3 标准，Side Panel 权限。 |
| **拖拽核心** | **@dnd-kit** | **核心新增**。用于实现侧边栏内部卡片的垂直排序、拖拽手感、Drop Indicator。 |
| **数据存储** | **Dexie.js (IndexedDB)** | 存储卡片数据及图片的 Blob 二进制。 |
| **样式** | **Tailwind CSS** | 快速构建流式布局。 |
| **打包导出** | **JSZip** | 生成包含 .canvas 和 attachments 图片文件夹的压缩包。 |

---

### 3. 数据结构 (Data Schema)

数据不再记录 `x, y` 坐标，而是记录 `order`（顺序）。

#### 3.1 核心数据接口
```typescript
// 类型定义：Node (卡片)
interface CanvasNode {
  id: string;             // UUID (对应 Obsidian Node ID)
  projectId: string;      // 所属画板/文件夹
  
  type: 'text' | 'file' | 'link'; 
  
  // 核心字段：排序索引 (使用浮点数或整数均可，建议整数 gap 留大一点方便插入)
  order: number;          
  
  // 内容载荷
  text?: string;          // 文本内容 / 链接的 Title
  fileData?: Blob;        // 图片/文件的二进制 (IndexedDB 独有)
  fileName?: string;      // 导出时的文件名 (e.g. "image-timestamp.png")
  
  // 来源元数据
  sourceUrl?: string;     // 来源网页 URL
  sourceIcon?: string;    // 来源网页 Favicon URL
  createdAt: number;
}

// 类型定义：Project (画板)
interface Project {
  id: string;
  name: string;
  updatedAt: number;
}
```

---

### 4. 核心业务逻辑 (Core Logic)

#### 4.1 混合拖拽系统 (The Hybrid Drag System)
我们需要同时兼容“从网页拖入”和“列表内部排序”。

*   **场景 A：外部采集 (External Drop)**
    *   **监听对象**：全局 `window` 或列表容器的 `drop` 事件。
    *   **逻辑**：
        1.  解析 `DataTransfer`（识别是文本、图片还是链接）。
        2.  如果是图片，触发 Background Service Worker 下载（解决 CORS）。
        3.  **插入位置**：默认插入列表**最底部** (Order = Max + 1)。
        4.  **UI 反馈**：显示 Loading 骨架屏 -> 图片下载完成 -> 渲染卡片。

*   **场景 B：内部排序 (Internal Sort)**
    *   **监听对象**：`@dnd-kit` 的 `<SortableContext>`。
    *   **逻辑**：
        1.  用户拖拽卡片 A 到 B 的位置。
        2.  前端 Optimistic UI 立即更新视图。
        3.  计算新的 `order` 值（如在 Prev 和 Next 之间取中间值，或重排整个数组）。
        4.  更新 Dexie 数据库。

#### 4.2 导出：列表转网格算法 (List-to-Grid Algorithm)
这是本项目的“魔法”所在。

```typescript
// 伪代码逻辑
const CARD_WIDTH = 400;  // 卡片宽度
const GAP = 50;          // 间距
const COLS = 4;          // 网格列数 (可配置)

function exportToCanvas(nodes: CanvasNode[]) {
  // 1. 确保按顺序排列
  const sorted = nodes.sort((a, b) => a.order - b.order);
  
  // 2. 映射为 Obsidian Canvas Node
  const canvasNodes = sorted.map((node, index) => {
    // 核心算法：一维转二维
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    
    return {
      id: node.id,
      type: mapTypeToObsidian(node.type),
      x: col * (CARD_WIDTH + GAP),
      y: row * (estimateHeight(node) + GAP), // 估算高度或固定高度步进
      width: CARD_WIDTH,
      height: estimateHeight(node), // 文本卡片短一点，图片卡片长一点
      text: node.text,
      file: node.type === 'file' ? `attachments/${node.fileName}` : undefined,
      // 注入来源链接 (Obsidian Canvas 支持 URL 属性吗？如不支持需注入到 text Markdown 中)
      ...
    };
  });
  
  return JSON.stringify({ nodes: canvasNodes, edges: [] });
}
```

---

### 5. UI/UX 详细规范 (Design Specs)

根据我们的“独裁清单”，UI 行为定义如下：

#### 5.1 布局结构
*   **Sticky Header**: 高度约 50px，固定在顶部。
    *   左侧：`< Back` 按钮。
    *   中间：当前画板名称（截断显示）。
    *   右侧：`Export` 按钮。
*   **Scrollable Area**: 占据剩余高度，显示卡片流。
*   **Bottom Area (Toast)**: 用于显示“撤销”提示的浮层，不占布局空间。

#### 5.2 卡片样式策略
*   **通用容器**: 圆角 8px，轻微阴影，白色背景。
*   **文本卡片**:
    *   **内容**: `line-clamp-4` (最多显示 4 行)。
    *   **交互**: 点击卡片 -> 展开/收起 (或弹窗查看全文，MVP 建议简单展开)。
    *   **只读**: 不提供编辑入口。
*   **图片卡片**:
    *   **图片**: `max-height: 180px`, `object-fit: cover` (保持整齐)。
    *   **Loading 态**: 灰色闪烁骨架屏 (Skeleton)。
    *   **错误态**: 裂图图标 + “下载失败”文字。
*   **链接卡片**:
    *   显示 OpenGraph 图片（如果有）+ 标题 + URL 域名。
*   **Footer (元数据区)**:
    *   所有卡片底部有一条极细的分割线。
    *   右下角显示 `favicon` (16x16) + 域名 (e.g., "zhihu.com")。点击跳转原网页。

#### 5.3 交互细节
*   **删除**: 鼠标悬停卡片右上角出现 `X` 按钮。点击后卡片立即消失。
*   **撤销**: 底部弹出 Toast "已删除 1 个项目 (撤销)"，停留 3 秒。
*   **Drop Indicator**: 外部文件拖入时，列表底部显示“释放以添加”的虚线框。

---

### 6. 开发实施路线图 (Implementation Plan)

#### **Phase 1: 基础架构 (Day 1-2)**
*   [ ] 初始化 Vite + React + CRXJS 项目。
*   [ ] 配置 Tailwind。
*   [ ] 实现 `ProjectList` (首页) 和 `CardStream` (详情页) 的路由切换（简单的 State 切换即可）。
*   [ ] 实现 Sticky Header 布局。

#### **Phase 2: 数据存储与显示 (Day 3-4)**
*   [ ] 封装 Dexie `db.ts`。
*   [ ] 编写 `useLiveQuery` hook，确保数据变化时 UI 实时响应。
*   [ ] 实现卡片的渲染组件（TextCard, ImageCard）。
*   [ ] 实现卡片的“折叠/展开” CSS 逻辑。

#### **Phase 3: 采集与混合拖拽 (Day 5-7)**
*   [ ] **难点攻克**：编写 Content Script 监听器，构造标准 Payload。
*   [ ] 实现 Side Panel 的 `onDrop` 处理。
*   [ ] 实现 Background Script 的图片下载器 (fetch blob)。
*   [ ] 集成 `@dnd-kit` 实现卡片的内部排序。

#### **Phase 4: 导出桥接 (Day 8-9)**
*   [ ] 实现 `List-to-Grid` 转换函数。
*   [ ] 集成 JSZip，将 Blob 数据打包。
*   [ ] 联调测试：导出 -> 解压 -> 放入 Obsidian -> 验证节点位置和图片显示。

#### **Phase 5: 优化与打磨 (Day 10)**
*   [ ] 添加 Favicon 获取逻辑（`https://www.google.com/s2/favicons?domain=...`）。
*   [ ] 实现删除后的 Toast 撤销功能。
*   [ ] 检查 Loading 状态和错误处理。

---

这是最新的行动指南。
**合伙人提问：** 如果你对这个 V2.0 文档没有异议，我建议我们现在就**冻结需求**，直接进入代码构建阶段。你要先从哪一部分开始看代码？是**数据库 Schema 定义**，还是 **Content Script 的拖拽监听**？