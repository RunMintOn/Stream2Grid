# 全局卡片操作按钮 UI 统一与优化计划

## 任务目标
统一全应用卡片（文本、链接、图片、项目卡片）的删除和操作按钮 UI，采用 Flexoki 配色方案，优化侧边栏点击体验。

## 设计规范

### 1. 配色方案 (Flexoki)
| 按钮类型 | 状态 | 背景色 (Hex) | 图标颜色 |
| :--- | :--- | :--- | :--- |
| **删除 (Red)** | 卡片 Hover | `#e05f65` (Red-400) | `#fffcf0` |
| | 按钮 Hover | `#af3029` (Red-600) | `#fffcf0` |
| **操作 (Blue)** | 卡片 Hover | `#4385be` (Blue-400) | `#fffcf0` |
| | 按钮 Hover | `#205ea6` (Blue-600) | `#fffcf0` |

### 2. 布局与尺寸
- **统一尺寸**：`w-8 h-8` (32px)，图标 `w-4 h-4`。
- **挂载位置**：
    - 右上角：`absolute top-0 right-0 translate-x-1/4 -translate-y-1/4`
    - 左上角：`absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4`
- **层级**：`z-30` 确保在所有内容之上。

### 3. 动效
- **显隐**：`opacity-0 group-hover:opacity-100`。
- **反馈**：按钮 Hover 时 `scale-110`，`active:scale-95`。

## 修改文件清单

### 1. `src/sidepanel/components/cards/TextCard.tsx`
- [x] 升级右上角删除按钮。
- [x] 升级左上角版本还原按钮（对齐镜像布局）。
- [x] 移除旧的 `Version Toggle` 内部逻辑中冲突的样式。

### 2. `src/sidepanel/components/cards/ImageCard.tsx`
- [x] 移除内部删除按钮。
- [x] 新增右上角绝对定位删除按钮。

### 3. `src/sidepanel/components/cards/LinkCard.tsx`
- [x] 移除内部删除按钮。
- [x] 新增右上角绝对定位删除按钮。

### 4. `src/sidepanel/components/layout/ProjectList.tsx`
- [x] 升级项目卡片的删除按钮配色与尺寸。

## 成功标准
- [x] 所有卡片的删除按钮位置完全一致（右上角挂角）。
- [x] 按钮尺寸变大，点击热区明显提升。
- [x] 采用了 Flexoki 红/蓝两级变色逻辑。
- [x] 按钮悬浮在内容上方，但通过“挂角”位置减少了对核心内容的遮挡。
- [x] 构建成功 (`npm run build`)。
