# 文本卡片模式隔离加固计划 (修复版)

## 任务目标
彻底解决文本卡片在“阅读模式”下依然显示光标、可点击以及 Ctrl+V 冲突的问题。

## 问题根因分析
1. **隔离不彻底**：虽然设置了 `contentEditable={isEditing}`，但由于 `DropZone.tsx` 中的全局 `paste` 监听器是在 `document` 上运行的，且其判断逻辑（`target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'`）没有包含 `contentEditable` 的 `div`，导致在阅读模式下粘贴时，全局监听器依然会触发。
2. **视觉残留**：`TextCard` 内部的 `div` 即使在不可编辑状态，由于默认的浏览器行为和 CSS 样式，可能在点击时依然会触发 Caret（光标）渲染。
3. **事件冒泡**：阅读模式下的单次点击可能触发了不必要的 focus。

## 核心修复逻辑

### 1. 强化全局粘贴拦截 (`DropZone.tsx`)
- 修改 `handlePaste`：增加对 `contentEditable` 元素的识别。如果粘贴目标是一个 `contentEditable` 元素（正在编辑的卡片），全局监听器应立即退出，由卡片组件自行处理。

### 2. 物理级 CSS 屏蔽 (`TextCard.tsx`)
- 引入 `select-none` 与 `pointer-events-none` 的动态切换？
- **优化方案**：在阅读模式下，通过 CSS 彻底禁用 Caret 渲染，并确保点击不会导致 focus。

### 3. 精准模式切换逻辑
- **阅读模式**：`contentEditable={false}` + `tabIndex={-1}` (防止 Tab 键切入) + 样式屏蔽。
- **编辑模式**：`contentEditable={true}` + `tabIndex={0}` + 自动 Focus + 坐标还原。

## 修改步骤

### 第一步：修改 `DropZone.tsx`
- 更新 `handlePaste` 过滤逻辑，识别 `isContentEditable` 属性。

### 第二步：加固 `TextCard.tsx`
- 增加 `tabIndex` 动态控制。
- 优化双击进入逻辑，确保状态转换瞬间拦截所有副作用。
- 修改 CSS 类：在非编辑状态下，强制 `cursor-default` 并通过 `caret-color: transparent` 辅助。

## 成功标准
- [x] 非编辑态点击卡片，**绝无**竖线光标闪烁。
- [x] 非编辑态 Ctrl+V，**只创建新卡片**，绝对不会塞进当前卡片。
- [x] 编辑态 Ctrl+V，**只在卡片内粘贴**，绝对不会创建新卡片。
- [x] 双击卡片任意位置，光标精准出现。
- [x] 构建成功 (`npm run build`)。
