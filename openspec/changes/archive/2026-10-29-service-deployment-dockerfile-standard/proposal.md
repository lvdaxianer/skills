# Proposal

## Why

现有 Docker 部署规范已经约束镜像 digest、持久化挂载和增量覆盖，但没有把 Dockerfile 的目录、启动入口、运行用户和运行时资源来源固化为可验收规则。特别是启动时下载依赖、模型、脚本或安装包会使部署不可复现，并可能绕过镜像审计。

## What Changes

- 新增完整的 Dockerfile 编写与验收规范，覆盖多阶段构建、基础镜像、文件白名单、用户、入口、健康检查、端口和只读根文件系统。
- 强制构建阶段获取并校验所有依赖；运行阶段禁止下载代码、依赖、模型、安装包或执行远程安装脚本。
- 增加运行时离线启动门禁、日志/进程/文件系统检查和失败行为。
- 将 Dockerfile 规范接入 Docker 部署流程、部署 checklist、artifact 安全和评估用例。
- 更新 Compose 模板注释，明确运行时资源不得从网络补齐。

## Capabilities

### New Capabilities

- `service-deployment-dockerfile`: 约束 Dockerfile 构建内容、运行时入口、资源完整性和离线启动行为。

### Modified Capabilities

- `service-deployment-docker-runtime`: 将 Dockerfile 构建门禁和运行时禁止下载纳入镜像发布契约。
- `service-deployment-standard`: 将 Dockerfile 验证和离线启动验收纳入 Docker 部署流程。

## Impact

- 影响 `service-deploy/SKILL.md` 及 Docker、artifact 安全、checklist、evals 和 Compose template references。
- 不修改业务项目代码，不连接服务器，不执行真实镜像构建或部署。
- 运行时仍可访问明确声明的数据库、Redis、对象存储或其他业务依赖；禁止的是通过启动流程下载软件、依赖、模型或代码。
