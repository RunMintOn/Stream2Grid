# Obsidian Canvas Export Fix Summary

## 修复内容

### 问题1: Link节点包含text字段 (已修复✅)
**问题**: 根据JSON Canvas v1.0规范，Link类型节点只应该包含`url`字段，但原代码在Line 94中添加了`text`字段。

**影响**: 导致Obsidian无法正确解析Link节点，显示异常。

**修复**: 移除了Link节点的`text`字段赋值，只保留`url`字段。

```typescript
// 修复前
} else if (node.type === 'link') {
  obsidianNode.url = node.url || ''
  obsidianNode.text = node.text || node.url || ''  // ❌ 错误
}

// 修复后
} else if (node.type === 'link') {
  // Link nodes should ONLY have 'url' field according to JSON Canvas v1.0 spec
  // Do NOT add 'text' field - it will cause Obsidian display issues
  obsidianNode.url = node.url || ''  // ✅ 正确
}
```

### 问题2: 节点高度过小 (已修复✅)
**问题**: 原高度设置（文本120px, 图片200px, 链接100px）太小，会导致内容被截断或显示不完整。

**影响**: Obsidian中节点可能显示不全。

**修复**:
```typescript
// 修复前
const CARD_HEIGHT_TEXT = 120
const CARD_HEIGHT_IMAGE = 200
const CARD_HEIGHT_LINK = 100

// 修复后
const CARD_HEIGHT_TEXT = 200    // +80px
const CARD_HEIGHT_IMAGE = 300   // +100px
const CARD_HEIGHT_LINK = 150    // +50px
```

### 问题3: 坐标未强制为整数 (已修复✅)
**问题**: JSON Canvas规范要求`x, y, width, height`为整数类型，但原代码直接使用计算结果。

**影响**: 可能导致某些解析器兼容性问题。

**修复**: 使用`Math.round()`确保坐标为整数。

```typescript
// 修复前
x: col * (CARD_WIDTH + GAP),
y: row * (estimateHeight(node) + GAP),

// 修复后
const x = Math.round(col * (CARD_WIDTH + GAP))
const y = Math.round(row * (estimateHeight(node) + GAP))
// ...
x: x,
y: y,
```

### 改进4: 使用UUID格式生成节点ID (已改进✅)
**问题**: 原ID格式为`node-${node.id}`（使用数据库ID），虽然符合规范但不够标准。

**改进**: 添加`generateUUID()`函数生成符合标准的UUID格式。

```typescript
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 使用
id: generateUUID(),  // e.g., "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6"
```

## 符合JSON Canvas v1.0规范的输出结构

### Text节点
```json
{
  "id": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "type": "text",
  "x": 0,
  "y": 0,
  "width": 400,
  "height": 200,
  "text": "# Hello World\nContent here..."
}
```

### File节点
```json
{
  "id": "b2c3d4e5-f6g7-8h9i-0j1k-l2m3n4o5p6q7",
  "type": "file",
  "x": 450,
  "y": 0,
  "width": 400,
  "height": 300,
  "file": "attachments/image-123.png"
}
```

### Link节点 (✅ 关键修复)
```json
{
  "id": "c3d4e5f6-g7h8-9i0j-1k2l-m3n4o5p6q7r8",
  "type": "link",
  "x": 900,
  "y": 0,
  "width": 400,
  "height": 150,
  "url": "https://github.com"
  // 注意：没有 "text" 字段！
}
```

## ZIP包结构

```
project-name.zip
├── project-name.canvas          # JSON Canvas文件（根目录）
└── attachments/                # 图片附件目录
    ├── image-123.png
    └── image-456.png
```

**Obsidian要求**:
- `.canvas`文件必须在ZIP根目录
- 图片必须在`attachments/`子目录
- `.canvas`中的`file`字段使用相对路径: `attachments/filename.png`

## 验证

### 构建状态
```bash
$ npm run build
✓ built in 1.19s
```
✅ TypeScript编译无错误

### 符合规范检查
- ✅ 顶层包含`nodes`和`edges`数组
- ✅ 所有节点包含必需字段：`id`, `type`, `x`, `y`, `width`, `height`
- ✅ Text节点包含`text`字段（Markdown格式）
- ✅ File节点包含`file`字段（相对路径）
- ✅ Link节点**仅**包含`url`字段（无`text`）
- ✅ 坐标为整数
- ✅ ID格式为UUID

## 下一步测试建议

1. **在WebCanvas中创建测试项目**，包含：
   - 至少1个文本卡片
   - 至少1张图片（从网页或本地拖入）
   - 至少1个链接卡片

2. **导出到Obsidian**，在Obsidian中打开`.canvas`文件，验证：
   - 文本节点正确显示，支持Markdown
   - 图片正常加载
   - 链接节点显示为卡片（带预览）
   - 布局符合网格排列
   - 无错误提示

## 文件变更

```
src/sidepanel/services/exporter.ts
  - Lines 40-44: 更新常量高度值
  - Lines 60-66: 新增generateUUID()函数
  - Lines 86-96: 使用Math.round()确保整数坐标
  - Lines 99-107: 移除Link节点的text字段
```

## 参考

- [JSON Canvas v1.0 官方规范](https://jsoncanvas.org/spec/1.0/)
- [Obsidian官方博客: Announcing JSON Canvas](https://obsidian.md/blog/json-canvas/)
- 项目本地规范文档: `refer_canvas_jsonspec.md`
