# context-handoff-output Specification

## Purpose
让用户在切换会话时获得一份准确、安全、可直接粘贴到新会话的上下文交接包，减少重复说明项目背景和当前工作的成本。

## Requirements

### Requirement: Generate a structured copyable handoff package

当用户请求总结上下文或准备切换会话时，skill MUST 将当前会话中已确认的关键信息整理为单一 Markdown 代码块，并按固定字段输出。

#### Scenario: Complete project context is available

- **WHEN** 当前会话包含任务目标、项目路径、分支、进度和待办等信息
- **THEN** 输出必须包含目标、项目/仓库、当前进度、已完成事项、待办事项和下一步，并保持这些事实的原意

#### Scenario: Context is incomplete

- **WHEN** 某个交接字段在当前会话中没有可靠事实
- **THEN** 该字段必须明确标记为“未提供”或“待确认”，不得使用猜测值补全

### Requirement: Preserve operational context

交接包 MUST 在当前会话存在相关事实时保留服务器、运行环境、端口、部署命令、项目地址、关键文件和验证命令等可操作信息。

#### Scenario: Operational details are present

- **WHEN** 会话中出现服务器连接、环境变量名、项目地址、命令或文件路径
- **THEN** 输出必须按类别保留这些信息，并区分已确认值与待确认值

#### Scenario: Operational details are absent

- **WHEN** 会话没有提及服务器或部署信息
- **THEN** 输出必须写明相关信息未提供，不得推断主机、端口、路径或部署方式

### Requirement: Protect sensitive information

交接包 MUST 识别并脱敏密码、访问令牌、私钥、Cookie、完整连接字符串和其他可用于认证或直接访问资源的秘密。

#### Scenario: Secret appears in conversation

- **WHEN** 当前会话包含密码、Token、私钥或带认证信息的连接字符串
- **THEN** 输出只能保留其用途和脱敏占位符，不得原样复制秘密

#### Scenario: Secret-like value is ambiguous

- **WHEN** 某段值疑似敏感但无法确认
- **THEN** skill MUST 采取保守脱敏，并提示用户在新会话中通过安全渠道补充

### Requirement: Distinguish facts, decisions, and uncertainty

交接包 MUST 将已确认事实、用户或模型已确认的决策、未决问题和风险分开呈现。

#### Scenario: Conversation contains conflicting or unresolved information

- **WHEN** 会话中存在多个候选路径、未解决问题或相互矛盾的说法
- **THEN** 输出必须列入“待确认/风险”，不得把不确定内容写成确定事实

#### Scenario: Conversation contains explicit decisions

- **WHEN** 用户已经确认技术方案、约束或下一步
- **THEN** 输出必须保留这些决策及其适用范围，便于新会话继续执行

### Requirement: Support concise and detailed modes

当用户指定简洁版、完整版或字段范围时，skill MUST 在不违反安全和事实约束的前提下调整输出粒度。

#### Scenario: User requests concise mode

- **WHEN** 用户要求简洁总结
- **THEN** 输出必须优先保留目标、当前状态、关键路径、待办和阻塞项，并删除冗余解释

#### Scenario: User requests detailed mode

- **WHEN** 用户要求完整交接信息
- **THEN** 输出必须补充关键决策、命令、验证结果、风险和缺失信息
