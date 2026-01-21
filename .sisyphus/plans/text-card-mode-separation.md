# 文本卡片阅读/编辑模式强区分优化计划

## 任务目标
实现文本卡片“阅读模式”与“编辑模式”的物理隔离，解决阅读模式下出现光标及 Ctrl+V 冲突的问题，同时保证双击进入编辑时定位精准。

## 核心逻辑
1. **彻底隔离阅读态**：在非编辑状态下，将 `contentEditable` 设为 `false`，并修改鼠标样式为 `cursor-default`。
2. **双击坐标捕捉**：在双击事件触发时，捕捉鼠标点击的物理坐标。
3. **精准焦点恢复**：进入编辑态后，利用 `document.caretRangeFromPoint` 将光标强制还原到用户点击的位置。
4. **行为保护**：在编辑态下，阻止粘贴事件冒泡，防止全局监听器创建重复卡片。

## 修改步骤

### 1. 结构与属性调整 (`TextCard.tsx`)
- 确保 `contentEditable={isEditing}`（已实现）。
- 修改 CSS 类：
    - `!isEditing` 时：`cursor-default`。
    - `isEditing` 时：`cursor-text`。

### 2. 优化进入编辑逻辑
- 修改 `handleEnterEdit`：
    - 接收 `React.MouseEvent`。
    - 在设置 `isEditing(true)` 之前，利用 `document.caretRangeFromPoint(e.clientX, e.clientY)` 预存光标位置。
- 更新 `useEffect` (监听 `isEditing`)：
    - 如果进入编辑态，根据预存的位置还原光标。

### 3. 增强粘贴保护
- 修改 `handlePaste`：
    - 在处理完内部粘贴逻辑后，调用 `e.stopPropagation()`。

## 成功标准
- [x] 单次点击文本卡片不会出现闪烁光标。
- [x] 非编辑状态下，鼠标悬停在文字上显示为标准指针（非文本工字型）。
- [x] 非编辑状态下，Ctrl+V 只会触发全局卡片创建，不会插入现有卡片。
- [x] 双击卡片任意位置，编辑光标能准确出现在点击处。
- [x] 编辑状态下，Ctrl+V 只会插入内容，不会触发全局卡片创建。
- [x] 构建成功 (`npm run build`)。
