# Alibaba Qwen Image — NewAPI 私有扩展

为 NewAPI 的 Alibaba 任务插件增加 `qwen-image-3.0` 和 `qwen-image-3.0-pro` 支持。当前扩展版本：**1.3.1-qwen.2**。只修改插件，不修改 NewAPI 主程序。

本项目不是 QuantumNous 或阿里云官方发布。基于 [QuantumNous/new-api-plugins](https://github.com/QuantumNous/new-api-plugins) 的 Alibaba 1.3.0，来源提交 `653d0d78bc3b668528ad709f4f923ee53a96c0ae`，保留 Apache-2.0 许可证及原作者信息。

## 安装与回退

### 通过插件市场源安装

在 NewAPI 插件市场的源管理中添加以下索引地址（不是 GitHub 仓库网页地址）：

```text
https://raw.githubusercontent.com/srchengtao2025/newapi-alibaba-qwen-plugin/main/index.json
```

源名称建议填写 `RezeAI Qwen 扩展（非官方）`。刷新后选择 Alibaba Qwen 扩展的 `1.3.1-qwen.2`，安装并确认该版本已激活。若已有 Alibaba 插件，先备份并等待任务结束；本扩展使用同一个 `alibaba` 键，不会作为另一个并行插件安装。不要误选官方源覆盖该扩展。

仓库已按用户授权公开，无需 GitHub Token。运行环境仍需能访问 `raw.githubusercontent.com`。安装仅导入插件，不会自动配置百炼密钥、渠道或 Qwen 计费表达式。

### 手动安装与回退

1. 备份当前 Alibaba 插件和 NewAPI 数据库；等待正在执行的任务结束。
2. 在插件管理中导入 `plugins/tasks/alibaba/1.3.1-qwen.2/plugin.js`。
3. **上传不等于激活**：在版本管理中激活 `1.3.1-qwen.2`，确认运行状态为 registered。
4. 此版本不改变既有 Qwen 价格表达式；从官方 1.3.0 首次迁移时，必须先配置 Qwen usage expression，不得直接沿用通用 image_count 计费。
5. 出现回归时激活备份版本；不要删除仍有关联任务的历史版本。

具体接口、参数与限制见版本目录中的 `README.zh-CN.md`。历史版本目录保留原始发布资料，其中“未部署”的描述是当时状态；本次验收以 `DEPLOYMENT_TEST.md` 为准。

## 本地验证

```sh
node test-qwen-v2.mjs
cd tools/pluginindex
go run . check ../..
```

149 个独立离线用例，覆盖参数、usage 事实校验、错误脱敏、异步状态及 Wan 原有行为对照。运行 fixture 不调用收费接口。可使用 NewAPI 的 `plugin test` 命令执行版本目录内的 `runtime.fixture.json`。

## 计费与适用边界

- 按百炼返回的 `qima_input_1k/2k`、`qima_output_1k/2k` 数量结算，不是所有图片统一单价。
- 参数失败、重复查询和正常成功结算需要在实际宿主上验证；离线通过不等于账单验收通过。
- 本插件不实现供应商账单查询，不保证退款与供应商现金账单自动一致。
- 不会自动重发生图请求。宿主层超时、扣费状态恢复、前端耗时显示等不能仅靠此插件解决。
- URL 检查不是 SSRF 防护；Base64 格式检查不是图片内容解码验证。
- 仓库不含账号、API Key、服务器地址、数据库、真实图片或完整客户日志。
