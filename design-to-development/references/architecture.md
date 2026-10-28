# 固定架构参考

本资料定义产品实现的固定工程边界。具体可靠性、交互、日志和代码质量规则由对应的权威 Skill 负责，本文件只规定如何把它们放进同一套可复用结构。

## 工程布局

```text
project/
├── frontend/
│   ├── src/
│   │   ├── main.ts           # 唯一应用入口
│   │   ├── app/              # App 根组件、全局 Provider、错误边界
│   │   ├── layouts/          # 页面壳层，不承载业务请求
│   │   ├── router/           # 路由定义、守卫和权限跳转
│   │   ├── views/            # 按业务模块分组的页面
│   │   │   └── <module>/
│   │   │       ├── <Page>.vue
│   │   │       ├── components/ # 页面专属组件
│   │   │       └── __tests__/  # 页面行为测试
│   │   ├── components/       # 跨页面共享 UI 组件
│   │   │   ├── base/         # 基础 UI 原语
│   │   │   ├── business/     # 跨页面业务组件
│   │   │   └── feedback/     # Loading、Empty、Error、Retry 等
│   │   ├── stores/           # Pinia 跨页面状态，按业务命名
│   │   ├── composables/      # 可复用交互和异步逻辑
│   │   ├── api/              # API Client，按业务命名
│   │   │   ├── http.ts       # 请求基础设施和错误归一化
│   │   │   └── mocks/        # 可替换 Mock Adapter
│   │   ├── types/            # API DTO、页面模型和共享类型
│   │   ├── utils/            # 无业务副作用的通用工具
│   │   ├── styles/           # SCSS token、全局样式和 Tailwind 入口
│   │   ├── assets/           # Vite 处理的资源
│   │   └── test/             # 测试初始化和共享 fixtures
│   ├── public/               # 不参与构建处理的静态文件
│   └── tests/e2e/            # 跨页面端到端测试
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

新项目 MUST 使用上述目录；已有项目只在新增能力涉及的边界增量补齐。页面按 `views/<module>/` 分组，页面专属组件放在页面目录内，跨页面稳定复用的组件放在共享 `components/`。API、Store 和类型分别放在对应技术目录，并按业务命名拆分文件。

## 依赖方向

```text
interfaces → application → domain
infrastructure → application/domain ports
```

前端依赖方向为：

```text
router → views
views → components / composables / stores
stores / composables → api
api → transport / mock adapter
```

组件不得直接发起后端请求，页面不得直接拼接请求细节或引用 Mock；Mock 只能作为 API Client 的可替换适配器。页面、组件、Store、Composable 和 API Client 测试邻近源码，端到端测试统一放在 `frontend/tests/e2e/`。

- Controller 只负责协议转换和调用用例，不承载业务规则。
- Application Service 负责一次业务用例的编排和事务边界。
- Domain 不依赖 Spring、MyBatis-Plus 或 HTTP 框架；简单 CRUD 也至少保持 Repository 接口边界。
- Infrastructure 实现 Repository、外部服务和配置适配器。
- API DTO、Persistence Model 和 Domain Model 分离；不得把 ORM Entity 直接作为 API 响应。

## 持久化替换边界

```java
public interface DemoRepository {
    Optional<Product> findById(ProductId id);

    Product save(Product product);
}
```

接口示例只表达业务需要的能力。MyBatis-Plus Mapper、DO、分页对象和数据库异常只能出现在 Infrastructure 内部；Application 和 Domain 不得接收这些类型。

## 数据库约束

- 默认使用 H2 运行项目，测试数据通过迁移和 seed 明确生成。
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

项目默认不引入微服务、消息队列、Redis、Kubernetes、真实支付或真实 OAuth。需要展示这些能力时，先建立端口和失败边界，再使用可替换的 Adapter。
