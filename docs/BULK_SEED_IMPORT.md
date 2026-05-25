# 批量导入热门歌曲索引与吉他谱搜索线索

## 重要边界

本流程导入的是：

```text
歌曲标题
歌手
搜索关键词
拼音 / 首字母
吉他谱搜索结果标题、链接、摘要
疑似调式 / 变调夹 / 和弦线索
```

不会导入：

```text
第三方完整歌词
第三方完整吉他谱
TAB 正文
逐字和弦谱正文
```

产品侧建议展示为：

```text
热门歌曲索引，暂无完整曲谱，可 AI 生成简化弹唱编配版
```

## 文件说明

```text
tools/ddgs_seed_catalog_builder.py
```

本地采集脚本，使用 DuckDuckGo/ddgs 生成歌曲索引 JSONL。

```text
tools/import_seed_catalog_to_cloudbase.py
```

本地导入脚本，通过 CloudBase CLI 分批调用 `seed-bulk-import` 云函数。

```text
cloudbase/cloudfunctions/seed-bulk-import/
```

云函数，负责批量 upsert 到 `songs` 集合。

## 1. 拉取最新代码

```bat
cd /d D:\ai\mini-weixinapp
git pull origin cloudbase-native
```

## 2. 安装 Python 依赖

建议使用 Python 3.10+。

```bat
pip install ddgs pypinyin
```

`ddgs` 用于 DuckDuckGo 搜索，`pypinyin` 用于生成中文歌名拼音和首字母。

## 3. 生成 10000 首歌曲索引

国内为主：

```bat
cd /d D:\ai\mini-weixinapp
python tools\ddgs_seed_catalog_builder.py --limit 10000 --country-weight cn --out cloudbase\database\seed_bulk_catalog.jsonl
```

测试版先跑 200 首：

```bat
python tools\ddgs_seed_catalog_builder.py --limit 200 --country-weight cn --out cloudbase\database\seed_bulk_catalog_test.jsonl
```

参数说明：

```text
--limit              目标数量
--country-weight     cn 国内为主，balanced 国内外均衡
--max-results        每次搜索读取多少条 DuckDuckGo 结果，默认 20
--pause              每次搜索间隔秒数，默认 0.8，太快容易失败
--out                输出文件
--format             jsonl 或 json，默认 jsonl
```

## 4. 部署导入云函数

```bat
cd /d D:\ai\mini-weixinapp\cloudbase
cloudbase functions:deploy seed-bulk-import
```

建议同时部署新版搜索函数：

```bat
cloudbase functions:deploy songs
cloudbase functions:deploy web-search
cloudbase functions:deploy ai-generate
```

## 5. 配置导入密钥，可选但推荐

在 CloudBase 控制台给 `seed-bulk-import` 配置环境变量：

```text
SEED_IMPORT_TOKEN=你自己的强密码
```

如果不配置，云函数不会校验 token。生产环境建议配置。

## 6. 试导入 dry run

```bat
cd /d D:\ai\mini-weixinapp
python tools\import_seed_catalog_to_cloudbase.py --input cloudbase\database\seed_bulk_catalog_test.jsonl --dry-run --token 你的导入密钥
```

如果你没有配置 `SEED_IMPORT_TOKEN`，可以不传 token：

```bat
python tools\import_seed_catalog_to_cloudbase.py --input cloudbase\database\seed_bulk_catalog_test.jsonl --dry-run
```

## 7. 正式导入

```bat
python tools\import_seed_catalog_to_cloudbase.py --input cloudbase\database\seed_bulk_catalog.jsonl --token 你的导入密钥
```

默认每批 100 条，可调整：

```bat
python tools\import_seed_catalog_to_cloudbase.py --input cloudbase\database\seed_bulk_catalog.jsonl --batch-size 50 --token 你的导入密钥
```

## 8. 导入后的数据形态

写入 `songs` 集合后：

```text
source_type = seed_bulk
has_tab = false
is_public = true
visibility = public
audit_status = seed
```

核心字段：

```text
title
artist_name
aliases
pinyin
initials
search_keywords
generation_source.tabReferences
generation_source.arrangementHints
content_json.arrangementHints
```

用户搜索命中后，小程序前端会展示 AI 生成按钮，而不是打开空曲谱。

## 9. 验证搜索

导入后测试：

```text
晴天吉他谱
成都弹唱
告白气球C调
起风了和弦谱
海阔天空吉他谱
```

预期：

```text
本地 songs 增强搜索命中 seed_bulk
前端提示暂无完整曲谱，可 AI 生成简化弹唱版
点击后生成 ai_web 私有曲谱
```

## 10. 注意事项

- 10000 首采集会比较慢，建议先跑 200 / 1000 进行验证。
- DuckDuckGo 无 Key 搜索受网络质量影响，失败时脚本会跳过并继续。
- 不建议把生成的 10000 条 JSONL 提交到 GitHub，文件可能较大，也会污染仓库。
- 不要把第三方完整吉他谱正文保存到数据库。
- seed 数据只是搜索索引和 AI 生成线索，不等于官方曲谱。
