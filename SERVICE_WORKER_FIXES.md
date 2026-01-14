# Service Worker 连接错误分析

## 错误信息
```
service-worker-loader.js:1 Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.
```

## 可能原因

### 1. Service Worker 配置问题
检查 `manifest.config.ts` 中的 service worker 配置。

### 2. Vite/CRXJS 配置问题
检查 `vite.config.ts` 中的 service worker 配置。

### 3. 实际运行环境
- 开发模式下使用 `npm run dev`
- 生产构建后加载 `dist/` 目录

### 4. 临时解决方案
在修复service worker问题之前，可以先关闭扩展的service worker：
1. chrome://extensions/
2. WebCanvas → Service worker
3. 点击 "停止"
4. 重新启动扩展

---

## 需要提供的信息

1. 完整的manifest配置（如果有）
2. vite.config.ts 的内容
3. 你如何运行扩展的？（dev mode 还是 build mode）
4. Service Worker 错误出现时的操作步骤

---

## 下一步

检查完配置后，我会提供具体的修复方案。
