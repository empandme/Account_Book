# 记账 App

本地存储 + PWA 的极简记账应用。手机端记账，电脑端偶尔做统计。

## 开发

```bash
npm install
npm run dev
```

## 部署

Push 到 `main` 分支即自动通过 GitHub Actions 部署到 GitHub Pages。

首次部署前：仓库 Settings → Pages → Source 选择 "GitHub Actions"。

## 使用

- iPhone Safari 打开 `https://<username>.github.io/counting-app/` → 分享 → "添加到主屏幕"
- Mac Safari 打开同一网址即自动进入分析模式
- 手机端"我的" → 导出 CSV/JSON → 通过 AirDrop/邮件/微信等发到 Mac → 拖入分析
