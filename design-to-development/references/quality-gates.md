# 质量门禁与交付参考

本资料用于交付前收集证据。具体规则仍以对应领域 Skill 的 canonical 文件为准。

## 必选门禁

### 启动环境预检

- [ ] 已读取 `references/environment-preflight.md`
- [ ] `java` 和 `javac` 存在，且主版本均为 21
- [ ] `JAVA_HOME` 指向同一套完整 JDK 21，命令路径已核对
- [ ] JDK 缺失时通过当前平台受信任包管理器直接安装，未卸载已有 JDK
- [ ] 未执行未知远程安装脚本，安装失败或版本不匹配时已停止后续工作

### 需求与设计

- [ ] 输入是文字需求或设计图，且不要求另一种输入作为前置条件
- [ ] 已使用 `superpowers:brainstorming`
- [ ] 已确认页面、流程、数据、权限、状态和验收标准
- [ ] 已记录设计图或需求中的推断和待确认项
- [ ] 用户已确认设计后才开始实现

### 架构与复用

- [ ] 使用固定前端和后端技术栈
- [ ] 前后端目录和模块边界清晰
- [ ] Controller、Application、Domain、Infrastructure 职责分离
- [ ] Repository Port 不依赖 MyBatis-Plus
- [ ] DTO、Domain Model、Persistence Model 没有混用
- [ ] 已有组件、Store、API Client 和测试设施优先复用

### TDD

- [ ] 每个行为任务都有先失败的聚焦测试
- [ ] RED 失败原因确实是缺少目标行为
- [ ] GREEN 是使测试通过的最小实现
- [ ] REFACTOR 后聚焦测试仍通过
- [ ] 已运行更大范围的测试、lint 或 build
- [ ] 成功和关键失败路径都有测试

### 前端

- [ ] 已加载 `frontend-interaction-guidelines`
- [ ] loading、empty、error、disabled、success、permission-denied 和长任务状态有定义
- [ ] 保存、删除、发布、上传和批量操作防止重复触发
- [ ] 删除操作有明确确认和破坏性视觉
- [ ] 列表有分页，过期请求不会覆盖较新状态
- [ ] 乐观更新有回滚或恢复路径
- [ ] 键盘、响应式和无障碍路径可用

### 后端与日志

- [ ] 已加载 `backend-reliability-guidelines`
- [ ] 客户端输入有服务端校验和允许字段白名单
- [ ] 写操作定义权限、幂等、事务、并发和失败恢复
- [ ] 环境配置隔离，生产缺少必要配置时不会静默使用开发默认值
- [ ] 错误契约稳定且不泄露内部细节
- [ ] 已加载 `logging-boundaries`
- [ ] traceId、敏感字段脱敏、日志级别、DEBUG 热开和异步 MDC 透传均有证据

### API 与文档

- [ ] 对外 Controller 已映射到业务模块
- [ ] 每个受影响模块只有一个 `apis/<module>.md`
- [ ] 文档包含请求、响应、错误、权限、分页、幂等和示例
- [ ] 文档与实现、测试和配置保持一致

### 代码审查与完成验证

- [ ] 已加载 `code-review-spec` 并检查完整变更范围
- [ ] 已修复应修复的审查问题并重新验证
- [ ] 已执行 `verification-before-completion`
- [ ] 没有用旧日志、局部命令或主观判断代替新鲜验证证据

## 交付报告模板

```text
工程位置：
前端启动命令：
后端启动命令：
测试命令及结果：
Lint/Build 命令及结果：
API 文档：
种子数据/示例账号：
已实现：
设计假设：
未实现或待确认：
可复用边界：
```

任何门禁未通过时，报告实际状态和阻塞原因，不得使用“完成”“通过”或同义表述。
