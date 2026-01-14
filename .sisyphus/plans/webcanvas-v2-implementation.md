# WebCanvas V2.0 实施计划

> **项目代号**: WebCanvas (Obsidian Browser Scout)  
> **文档版本**: devdoc2.0.md  
> **计划日期**: 2026-01-14  
> **预估工期**: 15-17 天（约 2.5 周）

---

## 1. 项目概览

### 1.1 核心价值

**问题**: 网页碎片化信息采集与非线性整理之间的断层

**解决方案**: 浏览器端提供"采集流"（垂直列表）→ 导出时自动转换为"知识网格"（二维布局）

### 1.2 用户工作流

```
1. 用户打开 Chrome 扩展侧边栏
2. 从任意网页拖拽内容（文本/图片/链接）到侧边栏
3. 内容以卡片形式显示在垂直列表中
4. 用户可通过拖拽排序卡片
5. 点击"导出"按钮，列表自动转为网格布局
6. 生成 .zip 包，包含 .canvas 文件和 attachments/ 文件夹
7. 用户在 Obsidian 中导入，进行深度编辑
```

### 1.3 核心功能范围（MVP）

| 模块 | 功能 | 优先级 |
|------|------|--------|
| 项目管理 | 创建/重命名/删除画板 | P0 |
| 卡片采集 | 文本/图片/链接拖拽采集 | P0 |
| 列表交互 | 垂直拖拽排序 | P0 |
| 数据持久化 | IndexedDB 自动保存 | P0 |
| 导出功能 | List-to-Grid 算法 + Zip 打包 | P0 |
| 卡片交互 | 展开/收起/删除/撤销 | P1 |
| UI 细节 | Loading 态/错误态/Favicon | P1 |

### 1.4 项目状态

- **当前状态**: 全新绿场项目（Greenfield）
- **已有代码**: 无
- **已有文档**: devDoc.md (V1.0), devdoc2.0.md (V2.0)
- **依赖库**: 尚未安装

---

## 2. 技术栈确认

### 2.1 核心技术栈

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|---------|
| **React** | 18.x | UI 框架 | 生态成熟，CRXJS 原生支持 |
| **Vite** | 5.x | 构建工具 | HMR 体验好，开发效率高 |
| **CRXJS** | 2.x | Chrome Extension 插件 | 现代化的 MV3 扩展开发方案 |
| **@dnd-kit** | 6.x | 拖拽排序 | 性能优秀，API 设计合理 |
| **Dexie.js** | 3.x | 数据库封装 | IndexedDB 友好，TypeScript 支持好 |
| **Tailwind CSS** | 3.x | 样式方案 | 快速构建 UI，原子化 CSS |
| **JSZip** | 3.x | 文件打包 | 纯前端 Zip 生成 |

### 2.2 关键技术决策

#### 决策 A: 数据库架构

**选择**: Dexie.js + IndexedDB（单库，多表）

**Schema**:
```typescript
// Version 1
db.version(1).stores({
  projects: '++id, name, updatedAt',
  nodes: '++id, projectId, type, order, createdAt'
});
```

**关键原则**: ❌ **不要索引 Blob 字段**（性能致命缺陷）

---

#### 决策 B: 拖拽实现

**选择**: @dnd-kit Sortable + VerticalListStrategy

**实现要点**:
- ✅ 使用 `verticalListSortingStrategy`
- ✅ DragOverlay 单独组件（避免 ID 冲突）
- ✅ 配置 PointerSensor `activationConstraint: {distance: 5}`
- ✅ React.memo 优化卡片组件

---

#### 决策 C: 导出格式

**选择**: 完全兼容 Obsidian Canvas JSON 规范

**List-to-Grid 算法**:
```typescript
const CARD_WIDTH = 400;
const GAP = 50;
const COLS = 4;

function listToGrid(nodes: Node[]): ObsidianNode[] {
  return nodes.sort((a, b) => a.order - b.order).map((node, index) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    
    return {
      id: node.id,
      type: mapType(node.type),
      x: col * (CARD_WIDTH + GAP),
      y: row * (estimateHeight(node) + GAP),
      width: CARD_WIDTH,
      height: estimateHeight(node),
    };
  });
}
```

---

## 3. 关键风险与缓解策略

### 风险 1: CRXJS 维护状态（高）

**缓解策略**:
1. ✅ 使用当前最新稳定版（v2.0.4+）
2. ✅ 备选方案：保留迁移到 WXT 的可能性

### 风险 2: 图片跨域下载（高）

**缓解策略**:
1. ✅ 在 manifest 中配置 `host_permissions: ['https://*/*']`
2. ✅ Background fetch 时设置适当 headers
3. ⚠️ 降级方案：无法下载时显示"加载失败"

### 风险 3: Obsidian Canvas 兼容性（中）

**缓解策略**:
1. ✅ 严格遵守 [jsoncanvas.org/spec/1.0/](https://jsoncanvas.org/spec/1.0/)
2. ✅ Phase 4 完成后，在真实 Obsidian 中测试

### 风险 4: 时间线乐观（中）

**缓解策略**:
1. ✅ 按 17 天规划（预留 40% 缓冲）
2. ✅ 每个阶段结束时重新评估进度

### 风险 5: 性能瓶颈（中）

**缓解策略**:
1. ✅ 使用 React.memo 优化卡片组件
2. ✅ 图片使用懒加载
3. ✅ 定期清理 Blob URL（URL.revokeObjectURL）

---

## 4. 详细实施路线图

### Phase 1: 基础架构搭建（Day 1-2）

**目标**: 搭建可运行的开发环境，实现基本布局

**任务清单**:
- [ ] 初始化 Vite + React + TS 项目
- [ ] 安装 CRXJS 和所有依赖
- [ ] 配置 manifest.config.ts 和 vite.config.ts
- [ ] 实现 Sticky Header 布局
- [ ] 实现项目列表/卡片流切换
- [ ] 验证扩展能在 Chrome 中加载

**验收标准**:
- ✅ `npm run dev` 能启动开发服务器
- ✅ `dist/` 目录生成 Chrome 扩展文件
- ✅ 在 `chrome://extensions` 中能加载扩展
- ✅ Side Panel 能打开
- ✅ Sticky Header 固定在顶部

---

### Phase 2: 数据存储与显示（Day 3-4）

**目标**: 实现 Dexie 数据库，卡片组件，基本增删改查

**任务清单**:
- [ ] 创建 Dexie 实例（db.ts）
- [ ] 定义 Project 和 Node 接口
- [ ] 实现 useLiveQuery hooks
- [ ] 创建 TextCard 组件（支持展开/收起）
- [ ] 创建 ImageCard 组件（Loading 态/错误态）
- [ ] 创建 LinkCard 组件（OpenGraph 元数据）
- [ ] 实现 CardStream 列表组件
- [ ] 集成响应式数据更新

**验收标准**:
- ✅ 数据库能成功打开
- ✅ 能手动添加节点（通过 DevTools）
- ✅ 节点列表自动更新（无需手动刷新）
- ✅ 删除节点后 UI 立即反映

---

### Phase 3: 采集与混合拖拽（Day 5-7）

**目标**: 实现从网页拖拽内容到列表，以及内部排序

**任务清单**:
- [ ] 实现 Content Script 拖拽监听器
- [ ] 构造标准 Payload（文本/图片/链接）
- [ ] 实现 Side Panel 的 onDrop 处理
- [ ] 实现 Background 图片下载器
- [ ] 集成 @dnd-kit 实现卡片内部排序
- [ ] 实现乐观 UI 更新
- [ ] 测试拖拽排序流畅度

**验收标准**:
- ✅ 拖拽文字到列表，创建文本卡片
- ✅ 拖拽链接到列表，创建链接卡片
- ✅ 拖拽图片到列表，触发 Background 下载
- ✅ 能拖拽卡片排序
- ✅ 拖拽时视觉流畅（60 FPS）
- ✅ 拖拽完成后 order 正确更新到数据库

---

### Phase 4: 导出桥接（Day 8-9）

**目标**: 实现 List-to-Grid 算法，生成 .canvas + .zip

**任务清单**:
- [ ] 实现 List-to-Grid 转换函数
- [ ] 集成 JSZip 库
- [ ] 实现 .canvas JSON 生成
- [ ] 实现图片附件打包到 attachments/
- [ ] 实现下载触发逻辑
- [ ] 在真实 Obsidian 中测试导入

**验收标准**:
- ✅ 生成的 JSON 符合 Obsidian Canvas 规范
- ✅ 图片正确添加到 attachments/ 文件夹
- ✅ 下载的 Zip 能解压
- ✅ 在 Obsidian 中导入 .canvas 文件，正确显示节点和图片

---

### Phase 5: 优化与打磨（Day 10-12）

**目标**: 添加 UI 细节、错误处理、撤销功能

**任务清单**:
- [ ] 实现 Favicon 获取（使用 Google 服务）
- [ ] 创建 Toast 组件
- [ ] 实现删除后撤销功能
- [ ] 优化图片 Loading 态（骨架屏动画）
- [ ] 添加网络错误处理和重试逻辑
- [ ] 实现空列表引导文案
- [ ] 实现导出 Loading 动画
- [ ] 优化自动保存逻辑

**验收标准**:
- ✅ 卡片底部显示网站 Favicon
- ✅ 删除卡片后显示 Toast
- ✅ 点击撤销，卡片恢复
- ✅ 3 秒后 Toast 自动消失
- ✅ 所有异步操作都有 Loading 状态
- ✅ 所有错误都有友好提示

---

## 5. 验收标准

### 5.1 功能验收

| 功能 | 验收标准 |
|------|---------|
| 项目管理 | 能创建、重命名、删除画板 |
| 文本采集 | 拖拽网页文字到列表，创建文本卡片 |
| 图片采集 | 拖拽图片到列表，自动下载并显示 |
| 链接采集 | 拖拽链接到列表，创建链接卡片 |
| 拖拽排序 | 能拖拽卡片重新排序 |
| 展开/收起 | 文本卡片支持展开查看全文 |
| 删除 | 能删除卡片，并显示撤销提示 |
| 导出 | 点击导出，下载 .zip 包 |
| Obsidian 导入 | 在 Obsidian 中导入 .canvas，正确显示节点和图片 |

---

### 5.2 性能验收

| 指标 | 目标 |
|------|------|
| 初始加载时间 | < 500ms |
| 卡片渲染 | 100+ 卡片无卡顿 |
| 拖拽流畅度 | 60 FPS |
| 图片加载 | < 2s（网络良好） |
| 导出时间 | < 5s（100 张图片） |

---

### 5.3 兼容性验收

| 环境 | 要求 |
|------|------|
| Chrome/Edge | >= 120 |
| Obsidian | >= 1.0（支持 Canvas） |
| 屏幕分辨率 | >= 1024x768 |

---

## 6. 附录

### 6.1 关键依赖版本

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "dexie": "^3.2.4",
    "dexie-react-hooks": "^1.1.7",
    "jszip": "^3.10.1"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.4",
    "@types/chrome": "^0.0.268",
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^5.4.11",
    "typescript": "^5.6.3",
    "tailwindcss": "^3.4.17",
    "postcss": "^8.4.49",
    "autoprefixer": "^10.4.20"
  }
}
```

---

### 6.2 项目结构

```
webcanvas-extension/
├── public/
│   ├── icons/
│   └── manifest.json
├── src/
│   ├── background/
│   │   └── index.ts
│   ├── content/
│   │   └── drag-listener.ts
│   ├── sidepanel/
│   │   ├── components/
│   │   │   ├── cards/
│   │   │   ├── layout/
│   │   │   └── common/
│   │   ├── hooks/
│   │   ├── services/
│   │   │   ├── db.ts
│   │   │   ├── exporter.ts
│   │   │   └── parser.ts
│   │   ├── App.tsx
│   │   ├── index.html
│   │   └── main.tsx
│   └── shared/
│       ├── types.ts
│       └── constants.ts
├── manifest.config.ts
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

### 6.3 开发工作流

```bash
# 启动开发服务器
npm run dev

# 在 Chrome 中加载扩展
# 1. 打开 chrome://extensions
# 2. 启用开发者模式
# 3. 点击"加载已解压的扩展程序"
# 4. 选择项目根目录下的 dist/ 文件夹

# 构建生产版本
npm run build
```

---

### 6.4 调试技巧

**Chrome DevTools**:
1. 在扩展页面右键 → 检查 → Side Panel DevTools
2. Background Service Worker: chrome://extensions → 检查视图: service worker
3. Content Script: 在任意网页打开 DevTools，在 Console 中查看日志

**React DevTools**:
- 在 Side Panel DevTools 中自动集成

**IndexedDB**:
- 在 Application 标签 → Storage → IndexedDB → WebCanvasDB

---

### 6.5 常见问题

**Q: 为什么图片下载失败？**  
A: 可能是 CORS 或防盗链限制。检查 manifest 中的 host_permissions 配置。

**Q: 为什么 Content Script 不生效？**  
A: 刷新网页，Content Script 只在新加载的页面注入。

**Q: 为什么 HMR 不工作？**  
A: 在 Chrome 中手动重新加载扩展。

**Q: 为什么导出的图片在 Obsidian 中不显示？**  
A: 检查 file 字段是否使用相对路径 `attachments/${fileName}`。

---

### 6.6 参考资料

- [CRXJS 官方文档](https://crxjs.dev/vite-plugin)
- [@dnd-kit 官方文档](https://docs.dndkit.com/)
- [Dexie.js 官方文档](https://dexie.org/)
- [Obsidian Canvas JSON 规范](https://jsoncanvas.org/spec/1.0/)
- [Chrome Extension Manifest V3 文档](https://developer.chrome.com/docs/extensions/mv3/)

---

## 7. 后续优化方向

### 7.1 短期优化（Post-MVP）

- [ ] 支持 Markdown 语法高亮
- [ ] 添加卡片颜色标记
- [ ] 支持更多图片格式（WebP, SVG）
- [ ] 添加键盘快捷键

### 7.2 中期优化

- [ ] 支持分组功能
- [ ] 添加搜索/过滤
- [ ] 支持标签系统
- [ ] 云同步（可选）

### 7.3 长期规划

- [ ] 支持 Obsidian 插件双向同步
- [ ] AI 自动分类和摘要
- [ ] 协作分享功能

---

**计划完成日期**: 2026-01-14  
**
