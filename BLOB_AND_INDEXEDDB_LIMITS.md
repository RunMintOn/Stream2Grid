# Blob 和 IndexedDB 的限制说明

## 1. Blob 本身没有硬性限制

Blob对象本身只是一个"容器"，包含二进制数据，理论大小没有限制。

实际限制来自：
- **浏览器内存**：创建Blob时需要将数据加载到内存
- **IndexedDB配额**：存储到数据库的总大小

---

## 2. IndexedDB 实际限制

### 浏览器存储限制（2025年）

| 浏览器 | IndexedDB配额 | 实际可用空间 |
|--------|--------------|-----------|
| Chrome | ~5-10GB/域名 | 临时存储+IndexedDB共享 |
| Firefox | ~2GB/域名 | 相对严格 |
| Safari | ~1GB/域名 | 相对严格 |
| Edge | 与Chrome相同 | - |

### 重要特点

✅ **无硬性限制**：不像localStorage只有5MB
✅ **持久化存储**：关闭浏览器后数据还在
✅ **大文件支持**：可以存储MB级别的图片
✅ **异步操作**：不阻塞主线程

---

## 3. WebCanvas插件的实际限制

### 理论限制

- ✅ **图片数量**：几乎无限制（受配额）
- ✅ **单个图片大小**：几MB到几十MB（取决于配额）
- ✅ **节点总数**：数万个（每个节点很小）

### 实际瓶颈

| 瓶颈 | 说明 |
|--------|------|
| **IndexedDB配额** | 如果达到配额，新数据无法存储 |
| **内存占用** | 太多/太大的图片会占用大量内存 |
| **导出性能** | 生成ZIP时需要将所有Blob加载到内存 |
| **浏览器崩溃** | 处理超大Blob可能崩溃 |

---

## 4. 实际测试数据

### 典型图片存储

```typescript
// 1. 小图片（图标、缩略图）
{
  type: 'file',
  fileName: 'icon-16x16.png',
  fileData: Blob(size: ~1KB)     // → ~1024字节
}

// 2. 普通图片（网页截图）
{
  type: 'file',
  fileName: 'screenshot-2025.png',
  fileData: Blob(size: ~500KB)   // → ~512,000字节
}

// 3. 大图（高清照片）
{
  type: 'file',
  fileName: 'photo-4k.jpg',
  fileData: Blob(size: ~5MB)      // → ~5,242,880字节
}

// 4. 超大图（罕见）
{
  type: 'file',
  fileName: 'panorama.jpg',
  fileData: Blob(size: ~20MB)     // → ~20,971,520字节
}
```

### 配额估算

假设Chrome配额10GB：

| 操作 | 耗费 |
|------|------|
| 存储100张小图（每张1KB） | ~100KB |
| 存储10张大图（每张5MB） | ~50MB |
| 存储1张超图（20MB） | ~20MB |
| **总计** | ~70MB（远低于10GB配额）|

---

## 5. 结论

### ✅ 可以安全使用

- **日常使用**：存储网页图片、截图完全OK
- **批量导入**：几十到几百张图无问题
- **长期存储**：IndexedDB会持续保存

### ⚠️ 需要注意

- **配额警告**：如果达到配额，浏览器会拒绝写入
- **内存管理**：不要一次性存入太多大图
- **定期清理**：删除不用的项目释放空间

---

## 6. 技术细节

### Blob 是如何存储的？

```javascript
// 存储时
const blob = new Blob([byteArray], { type: 'image/png' })

// IndexedDB实际存储
{
  fileData: blob  // ← 引用Blob，数据在IndexedDB的文件系统中
}

// 导出时读取
const zip = new JSZip()
zip.file('image.png', node.fileData)  // ← 直接使用Blob，无需转换
```

### 为什么不用索引Blob？

```typescript
// ❌ 错误做法（会导致崩溃）
nodes: '++id, projectId, type, fileData, createdAt'

// ✅ 正确做法（只索引必要字段）
nodes: '++id, projectId, type, createdAt'
// fileData字段存在但不索引，避免尝试对Blob创建索引
```

从db.ts的第35行注释可以清楚看到：
```typescript
// ⚠️ IMPORTANT: Do NOT index fileData (Blob) - it will crash the database!
```
