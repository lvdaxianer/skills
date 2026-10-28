# API 与数据契约参考

本资料定义项目如何保持前后端可替换、可联调和可复用；对外 API 文档的完整字段要求由 `rest-api-documentation` 负责。

## API 基线

- 默认使用 `/api/v1`，除非已有项目已有稳定版本约定。
- 路径表达资源，查询参数表达分页、排序和筛选；请求体只承载资源数据。
- Request DTO、Response DTO、Domain Model 和 Persistence Model 分离。
- 统一返回业务码、用户可读消息、数据或错误详情和 traceId；错误不得泄露堆栈、SQL、表名、密钥或敏感信息。
- 每个端点明确调用方、权限、输入约束、成功响应、失败响应、分页和幂等要求。

## 列表与异步状态

列表必须有明确分页、稳定排序和有限查询规模。列表项需要稳定 ID；如果展示进度或中间状态，按 ID 更新变化项，不要为一个进度变化重新拉取和替换整个页面。

搜索、筛选和切换标签时，使用请求序列或 `AbortController` 取消/忽略过期请求。慢任务返回可追踪的任务 ID 和状态，而不是依赖前端内存中的临时状态。

## 写操作契约

对保存、删除、发布、批量处理和其他数据变更定义：

- 服务端校验和允许字段白名单
- 身份认证、资源权限和租户边界
- 重复请求的结果、幂等键或唯一约束
- 事务边界和状态转换
- 并发保护，如版本号、条件更新或唯一约束
- 失败恢复、重试和用户下一步操作

前端 debounce、按钮 disabled 和 loading 不能替代后端幂等。

## 数据访问边界

```text
Use Case → Repository Port → Persistence Adapter → Mapper/Database
```

- Repository Port 只表达业务需要的查询和写入能力。
- Persistence Adapter 把 Domain 与数据库模型互相转换。
- Mapper、分页对象、SQL、数据库异常和 ORM 注解不得泄漏到 Domain/Application。
- Mock Adapter 和 MyBatis-Plus Adapter 遵守同一个 Port，避免前端被临时数据结构绑死。

## 迁移与环境

- H2 作为默认项目运行环境，测试配置与开发配置分离。
- MySQL 使用独立 Profile；禁止开发/测试配置指向生产服务。
- 迁移脚本可审查、可重复执行，并考虑数据量、索引、锁和旧代码兼容性。
- 需要环境变量时同步 `.env.example` 或后端配置说明，不提交真实密钥。

## API 文档门禁

存在公开 Controller/API 时，建立 `Controller/route → 业务模块 → apis/<module>.md` 映射。一个业务模块只维护一个文档；每个端点必须有用途、权限、Method/URL、参数、请求体、Header/Cookie、成功响应、失败响应和可运行示例。
