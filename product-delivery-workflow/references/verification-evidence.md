# 验收证据协议

## 证据目录

每次 run 在项目 `.product/runs/<runId>/` 下保存：

- `contracts.json`：每条验收标准一条验证契约；
- `verification/evidence/*.json`：命令、API、浏览器或冒烟证据；
- `verification/verification-bundle.json`：最终门禁结果、证据引用、版本绑定和哈希。

## 必要字段

| 类型 | 必须保存 |
| --- | --- |
| `command` | 命令、预期、实际、退出码、status、commit/release |
| `api` | API 摘要、预期、实际、status、commit/release |
| `browser` | 页面 URL、操作记录、页面断言、截图引用、预期、实际、status、commit/release |
| `smoke` | 命令、退出码、预期、实际、status、commit/release |

页面证据还应尽量保存 trace、console/network 摘要和下载 checksum。截图、URL、操作或断言缺失时不能标记成功。

## 结果语义

- `FAILED`：证据明确失败。
- `INCONCLUSIVE`：证据缺失、版本不匹配或无法建立当前版本绑定。
- `VERIFIED`：每条验收都有完整、通过且绑定当前 commit/release 的证据。

只有 `VERIFIED` 才能进入最终审计和部署决策。文件 bundle 自带 SHA-256 内容哈希，可用于交接时确认内容没有被替换。
