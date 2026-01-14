# 粘贴功能测试指南

## 已修复的问题

✅ **Service Worker base64转换Bug** - 已修复
✅ **Service Worker Loader错误** - 已禁用自动生成的loader

---

## 现在需要测试的功能

### 1. 文本粘贴
**测试步骤：**
1. 在任意网页（如baidu.com）上复制一段文字
2. 打开WebCanvas侧边栏
3. 按 `Ctrl+V` 粘贴
4. 在侧边栏查看新创建的文本卡片

**预期结果：**
- ✅ 文本成功添加到项目
- ✅ 来源页面URL正确记录（作为sourceUrl）
- ✅ Console显示：`[WebCanvas] Pasted text: 文本内容...`

---

### 2. 图片粘贴
**测试步骤：**
1. 在任意网页（如Google图片）上右键复制图片
2. 打开WebCanvas侧边栏
3. 按 `Ctrl+V` 粘贴
4. 等待几秒钟（后台自动下载图片）
5. 在侧边栏查看新创建的图片卡片

**预期结果：**
- ✅ 图片成功添加到项目
- ✅ Console显示：`[WebCanvas] Pasted image: image-xxx.png, size: xxx`
- ✅ 下载图片的URL被记录

---

### 3. URL粘贴
**测试步骤：**
1. 在任意网页上复制一个URL（如 https://github.com）
2. 打开WebCanvas侧边栏
3. 按 `Ctrl+V` 粘贴
4. 在侧边栏查看新创建的链接卡片

**预期结果：**
- ✅ URL成功添加到项目
- ✅ 自动获取Favicon图标
- ✅ Console显示：`[WebCanvas] Pasted URL: https://...`

---

### 4. HTML内容粘贴（网页复制）
**测试步骤：**
1. 在任意网页上复制一张图片或一个链接
2. 打开WebCanvas侧边栏
3. 按 `Ctrl+V` 粘贴

**预期结果：**
- ✅ 自动提取图片/链接并创建卡片
- ✅ 后台自动下载网页图片
- ✅ Console显示相关日志

---

## 需要查看的日志

**测试时，请在Console中找到以下日志：**

1. `[WebCanvas] Paste event triggered` - 确认粘贴事件被触发
2. `[WebCanvas] Pasted xxx: ...` - 确认内容类型
3. `[WebCanvas] Base64 conversion successful` - 确认图片下载成功（如果有图片）

---

## 成功标准

✅ 所有类型的粘贴都能工作（文本、图片、URL）
✅ 图片能正确存储和显示
✅ 链接能正确添加并获取Favicon
✅ Console日志正常

---

## 如果测试失败

| 问题 | 可能原因 | 解决方案 |
|------|----------|--------|
| 粘贴无反应 | 检查剪贴板是否有内容 |
| 粘贴失败无日志 | 按F12查看Console错误信息 |
| 图片不显示 | 等待几秒钟，后台下载需要时间 |

---

**开始测试吧！**
