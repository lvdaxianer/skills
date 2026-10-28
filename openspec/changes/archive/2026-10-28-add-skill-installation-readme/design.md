# Design: skill installation README

README 以“AI 安装协议”为主，先定位当前 README 所属仓库，再检测可用的 Skill 目标目录。默认提供稳定复制模式，同时提供仓库开发用软链接模式。

依赖分为三层：主 Skill；每次开发都必须存在的核心规范；按任务触发但建议预装的扩展规范。依赖如果在当前仓库不存在，README 要求 AI 使用平台已配置的 Skill 注册源按精确名称安装，不能猜测 URL 或执行未知脚本。

验证必须检查每个目标目录都包含带有效 `name` 的 `SKILL.md`，主 Skill 的 references 存在，brainstorming 能通过 `superpowers:brainstorming` 或本地等价映射获得，并输出安装清单和失败项。
