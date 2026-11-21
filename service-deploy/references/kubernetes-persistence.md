# Kubernetes 持久化硬门禁

本文件只适用于已有、可访问且由客户确认的 Kubernetes 集群。它不负责安装集群，也不把 Kubernetes 降级为 Docker 或物理机运行。

## 实施人员先确认的资源表

./doctor.sh 必须先输出以下默认资源，实施人员逐项让客户确认：

| 资源 | 镜像默认值 | Kubernetes 持久化目标 | 默认读写 | 覆盖规则 |
| --- | --- | --- | --- | --- |
| 前端静态资源 | 镜像内 /app/html 或服务声明路径 | 已存在 PVC/PV | 只读 | 只能挂载独立 /app/overrides/frontend |
| 后端包 | 镜像内 /app/bin 或服务声明路径 | 已存在 PVC/PV | 只读 | 只能挂载独立 backend extension point |
| lib | 镜像内 /app/lib | 已存在 PVC/PV | 只读 | 不得覆盖 /app/lib，只能使用 /app/overrides/lib |
| conf | 镜像默认配置 | 已存在 PVC/PV | 只读 | 使用外部配置路径，保留镜像默认值 |
| 数据库数据 | 无可依赖的容器默认数据 | 独立 PVC/PV 或外部数据库 | 可写 | 不得放在容器 writable layer |
| MinIO/对象存储数据 | 无可依赖的容器默认数据 | 独立 PVC/PV 或外部对象存储 | 可写 | 不得把 Pod 文件系统作为唯一来源 |
| 索引/其他数据 | 按服务声明 | 独立 PVC/PV 或外部托管 | 按清单 | 必须有备份和恢复步骤 |

客户必须为每一行选择：

- cluster-persistent：填写已经创建且可绑定的 PVC/PV、Namespace、StorageClass、容量、访问模式和备份策略。
- external-managed：填写外部系统责任人、非敏感引用和恢复证据。
- 未确认或只填写“以后再准备”：只能输出 dry-run，不能创建 Deployment、StatefulSet、Service 或 Pod。

## 必须通过的只读检查

1. kubectl、kubeconfig、context 和 Namespace 必须是客户明确指定的值。
2. API Server、权限、架构、资源配额、StorageClass 和镜像来源检查通过。
3. 每个 cluster-persistent 资源的 PVC/PV 已存在或明确处于可绑定状态，绑定后容量、访问模式和挂载路径满足清单。
4. 每个配置/代码覆盖 PVC 以只读方式挂载；数据库、MinIO、索引等数据 PVC 按清单以可写方式挂载。
5. 记录 PVC/PV 名称、Namespace、StorageClass、绑定状态、备份策略和恢复命令引用；不记录 kubeconfig、Token 或完整连接串。
6. 校验 Kubernetes 清单不存在 hostPath、匿名卷、未声明 PVC、挂载整个 /app、覆盖 /app/bin、/app/lib、/app/html 或 entrypoint。

## 立即停止条件

出现任一情况，./doctor.sh 必须返回失败并停止：

- 没有现成集群、context、Namespace、权限或 StorageClass。
- 必需 PVC/PV 不存在、未绑定、容量不足或访问模式不匹配。
- 实施人员无法确认某一项资源的持久化目标、备份责任或恢复步骤。
- 试图使用 hostPath、节点本地目录、匿名卷或 Pod writable layer 代替 PVC/PV。
- 镜像未提供默认资源，且对应 PVC/PV 覆盖目录为空。
- 覆盖挂载会隐藏镜像默认资源，或没有服务声明的独立 extension point。

## 资源回退和升级

镜像可以携带前端、后端、lib 和 conf 的完整默认资源。PVC 覆盖目录为空时使用镜像默认值；有文件时只加载清单中校验通过的文件，未列出的默认文件仍从镜像读取。升级必须创建新 release 和新 manifest，不能修改旧 PVC 内容或旧 release 的覆盖层；健康、有效加载和冒烟检查失败时只恢复记录的上一 release 与持久化清单。
