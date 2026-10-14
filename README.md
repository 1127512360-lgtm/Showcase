# Binbin Zhao — Portfolio

赵彬彬 · 视觉设计师 / 设计负责人 · 个人作品集网站

纯静态站点：手写 HTML / CSS / JavaScript，没有框架、也不需要构建步骤 ——
直接用浏览器打开 `index.html` 就能跑。

- **在线访问：** https://1127512360-lgtm.github.io/Showcase/
- **联系：** 1127512360@qq.com · [ZCOOL 站酷](https://www.zcool.com.cn/work/ZNjY3NjkyODA=.html)

---

## 目录

| 路径 | 内容 |
| --- | --- |
| `index.html` | 首页：首屏胶囊轮播 · 作品墙 · 作品索引 · 简介 · 合作品牌 · 联系方式 |
| `index-c.html` | 与首页完全相同的一份副本（保留旧链接用） |
| `index-a.html` · `index-b.html` · `index-kv.html` | 另外三版首屏方案（备选，可忽略） |
| `work/*.html` | 15 个项目二级页：设计背景 / 设计思路 / 成果展示（含两条项目成片） |
| `assets/css/style.css` | 全部样式（设计令牌在最上面） |
| `assets/js/main.js` | 全部交互（语言切换 / 首屏轮播 / 视差 / 瀑布流 / 自定义光标） |
| `assets/img/p/<slug>/` | 每个项目的封面、二级页首图与成果图板 |
| `assets/img/hero/` | 首屏轮播用的 7 张封面 |
| `assets/video/` | 两条项目成片 |
| `content/copy-deck.md` | 全站中英文文案副本（便于通读校对） |

## 交互

- **首屏**：黑底胶囊横向轮播，每 3.2 秒自动前进一张；点胶囊下方的 `←` `→` 或左右两侧的图
  可手动切换，点中间那张进入对应项目。
- **二级页**：满屏首图 + 成果图板，横版图单张占满一整行、竖版图两张并排；
  滚到页面底部进入下一个项目。
- 首页右上角 `EN / 中文` 可以切换全站语言。

## 说明

- 站点是纯静态的，所有资源都用相对路径，放在任何子目录（包括 GitHub Pages 的
  `/<repo>/` 路径）下都能直接打开。
- 图片已经按显示尺寸压缩好；视频用 `preload="metadata"`，不影响首屏加载。
- 部署方式：GitHub Pages，来源为 `main` 分支根目录。
