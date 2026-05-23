# 谱灵AI CloudBase 原生方案

架构:

微信小程序
   ↓
云函数(cloudfunctions)
   ↓
云数据库
   ↓
云存储
   ↓
OpenAI API

目录:

cloudbase/
├── cloudfunctions/
│   ├── login
│   ├── songs
│   ├── comments
│   ├── ai-generate
│   └── notifications
│
├── database/
│   ├── users
│   ├── songs
│   ├── comments
│   └── follows
│
└── cloudbaserc.json

部署:

cloudbase framework deploy
