# 固定架构参考

本资料定义 Demo 的固定工程边界。具体可靠性、交互、日志和代码质量规则由对应的权威 Skill 负责，本文件只规定如何把它们放进同一套可复用结构。

## 工程布局

```text
demo/
├── frontend/
│   ├── src/
│   │   ├── app/              # 路由、应用级插件、全局错误边界
│   │   ├── pages/            # 路由页面和页面编排
│   │   ├── components/       # 可复用 UI 组件
│   │   ├── features/         # 以业务能力组织的交互模块
│   │   ├── stores/           # Pinia 跨页面状态
│   │   ├── composables/      # 可复用交互和请求逻辑
│   │   ├── api/              # API Client、DTO 和错误转换
│   │   └── styles/           # SCSS token、全局样式和 Tailwind 入口
│   └── tests/
└── backend/
    ├── src/main/java/.../
    │   ├── interfaces/       # Controller、Request/Response DTO
    │   ├── application/      # 用例、事务边界、权限协调
    │   ├── domain/           # 业务规则、实体、值对象、Repository 接口
    │   └── infrastructure/  # MyBatis-Plus、H2/MySQL、外部服务适配器
    ├── src/main/resources/
    │   ├── application.yml
    │   ├── application-dev.yml
    │   ├── application-test.yml
    │   ├── application-mysql.yml
    │   └── db/migration/
    └── src/test/
```

如果已有项目目录不同，优先保留已有稳定约定，但必须保留相同的依赖方向和职责边界。

## 依赖方向

```text
interfaces → application → domain
infrastructure → application/domain ports
```

- Controller 只负责协议转换和调用用例，不承载业务规则。
- Application Service 负责一次业务用例的编排和事务边界。
- Domain 不依赖 Spring、MyBatis-Plus 或 HTTP 框架；简单 CRUD 也至少保持 Repository 接口边界。
- Infrastructure 实现 Repository、外部服务和配置适配器。
- API DTO、Persistence Model 和 Domain Model 分离；不得把 ORM Entity 直接作为 API 响应。

## 持久化替换边界

```java
public interface DemoRepository {
    Optional<Demo> findById(DemoId id);

    Demo save(Demo demo);
}
```

接口示例只表达业务需要的能力。MyBatis-Plus Mapper、DO、分页对象和数据库异常只能出现在 Infrastructure 内部；Application 和 Domain 不得接收这些类型。

## 数据库约束

- 默认使用 H2 运行 Demo，测试数据通过迁移和 seed 明确生成。
- 需要 MySQL 兼容性时提供独立 Profile；不要依赖 H2 特有语法或隐式类型转换。
- 迁移脚本必须可审查、可重复执行，并考虑旧代码与新代码短暂共存。
- 列表查询必须有明确分页、稳定排序和上限。
- 多表写入、状态变更和需要一致性的操作必须由 Application 层定义事务边界。
- ID、时间、状态和软删除策略由业务模块明确，不让 ORM 默认行为成为隐式契约。

## 前端复用边界

- 页面只负责组合页面结构和任务路径。
- 组件只接收完成任务所需的最小稳定标识；需要完整数据时从 Store 或查询层读取。
- Pinia 保存跨页面共享状态；局部输入、弹窗开关和临时 loading 留在组件或 Composable。
- API Client 统一处理 base URL、traceId、错误结构和取消请求。
- Tailwind 负责布局、间距和常规变体；SCSS 负责主题 token、复杂局部样式和确有必要的动画。
- UI 原语优先复用项目已有组件库；没有合适能力时才组合或新增自定义组件。

## 明确不引入

Demo 默认不引入微服务、消息队列、Redis、Kubernetes、真实支付或真实 OAuth。需要展示这些能力时，先建立端口和失败边界，再使用可替换的 Demo Adapter。
