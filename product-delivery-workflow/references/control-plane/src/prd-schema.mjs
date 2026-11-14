const SOURCE_TYPES = new Set(['explicit', 'inferred', 'default', 'project-context']);
const REQUIRED_SECTIONS = [
  'background',
  'goals',
  'roles',
  'userStories',
  'flows',
  'businessRules',
  'dataStates',
  'permissions',
  'scope',
  'acceptanceCriteria',
  'testIntents',
  'assumptions',
  'risks',
  'dependencies'
];
const TRACEABLE_COLLECTIONS = [
  'goals',
  'roles',
  'userStories',
  'businessRules',
  'acceptanceCriteria',
  'testIntents'
];

/**
 * 根据简单自然语言需求生成可追踪的 PRD 草稿。
 *
 * @param {object} input PRD 输入
 * @param {string} input.intake 原始需求
 * @param {string} input.version PRD 版本
 * @param {string[]} input.projectFacts 项目事实
 * @returns {object} PRD 草稿
 * @author lvdaxianer@yeah.net
 */
export function generateDefaultPrd({ intake, version, projectFacts = [] }) {
  return {
    prdId: `PRD-${version.toUpperCase()}`,
    version,
    background: { id: 'BG-001', content: intake, source: 'explicit' },
    goals: [{ id: 'GOAL-001', content: `让用户完成：${intake}`, source: 'explicit' }],
    roles: [{ id: 'ROLE-001', name: '目标用户', source: 'inferred' }],
    userStories: [{
      id: 'US-001',
      content: '作为目标用户，我希望完成上述需求，以获得可验证的业务结果。',
      source: 'inferred'
    }],
    flows: {
      main: [{
        id: 'FLOW-001', content: '用户提交输入，系统处理并返回成功结果。', source: 'inferred'
      }],
      exceptions: [{
        id: 'FLOW-ERR-001',
        content: '输入无效或依赖不可用时，系统返回可理解的错误。',
        source: 'default'
      }]
    },
    businessRules: [{
      id: 'RULE-001',
      content: '只有满足前置条件的请求才能进入成功状态。',
      source: 'default'
    }],
    dataStates: [{ id: 'STATE-001', name: '待处理 → 成功或失败', source: 'default' }],
    permissions: [{
      id: 'PERM-001', content: '目标用户只能操作自己有权限的资源。', source: 'default'
    }],
    scope: {
      included: [{ id: 'SCOPE-IN-001', content: intake, source: 'explicit' }],
      excluded: [{
        id: 'SCOPE-OUT-001', content: '不改变未被需求明确要求的既有流程。', source: 'default'
      }]
    },
    acceptanceCriteria: [{
      id: 'AC-001',
      content: '给定有效输入时，系统完成目标流程并返回可观察的成功结果。',
      source: 'inferred',
      verification: 'API 或浏览器自动化断言成功结果和状态变化。'
    }],
    testIntents: [{
      id: 'TEST-001',
      content: '覆盖主流程、无效输入、权限边界和依赖失败。',
      source: 'default'
    }],
    assumptions: [{
      id: 'ASM-001',
      content: '项目提供可运行的测试或验收环境。',
      source: 'default',
      status: 'open'
    }],
    risks: [{ id: 'RISK-001', content: '需求未说明的边界可能造成实现偏差。', source: 'inferred' }],
    dependencies: projectFacts.map((content, index) => ({
      id: `DEP-${String(index + 1).padStart(3, '0')}`,
      content,
      source: 'project-context'
    }))
  };
}

/**
 * 校验 PRD 的固定结构、来源标记和可追踪 ID。
 *
 * @param {object} prd PRD 对象
 * @returns {{valid: boolean, errors: string[]}} 校验结果
 * @author lvdaxianer@yeah.net
 */
export function validatePrd(prd) {
  const errors = [];
  REQUIRED_SECTIONS.forEach((section) => {
    if (!(section in prd)) {
      errors.push(`缺少章节 ${section}`);
    }
  });
  if (!/^prd-v\d+$/.test(prd.version ?? '')) {
    errors.push('PRD 版本无效');
  }
  TRACEABLE_COLLECTIONS.forEach((section) => validateCollection(prd[section], section, errors));
  validateTraceableObject(prd.background, 'background', errors);
  validateNestedFlows(prd.flows, errors);
  validateNestedScope(prd.scope, errors);
  validateAssumptions(prd.assumptions, errors);
  return { valid: errors.length === 0, errors };
}

/**
 * 检查一个可追踪集合的 ID 和来源。
 *
 * @param {unknown} collection 待检查集合
 * @param {string} section 章节名
 * @param {string[]} errors 错误集合
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function validateCollection(collection, section, errors) {
  if (!Array.isArray(collection) || collection.length === 0) {
    errors.push(`${section} 必须是非空数组`);
    return;
  }
  collection.forEach((item) => validateTraceableObject(item, section, errors));
}

/**
 * 检查对象是否包含稳定 ID 和来源类型。
 *
 * @param {object|undefined} item 待检查对象
 * @param {string} section 章节名
 * @param {string[]} errors 错误集合
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function validateTraceableObject(item, section, errors) {
  if (!item || typeof item.id !== 'string' || item.id.length === 0) {
    errors.push(`${section} 缺少稳定 ID`);
  }
  if (!item || !SOURCE_TYPES.has(item.source)) {
    errors.push(`${section} 缺少有效 source`);
  }
}

/**
 * 检查主流程和异常流程。
 *
 * @param {object|undefined} flows 流程对象
 * @param {string[]} errors 错误集合
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function validateNestedFlows(flows, errors) {
  ['main', 'exceptions'].forEach((name) => validateCollection(flows?.[name], `flows.${name}`, errors));
}

/**
 * 检查范围内外条目。
 *
 * @param {object|undefined} scope 范围对象
 * @param {string[]} errors 错误集合
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function validateNestedScope(scope, errors) {
  ['included', 'excluded'].forEach((name) => validateCollection(scope?.[name], `scope.${name}`, errors));
}

/**
 * 检查假设状态是否合法。
 *
 * @param {unknown} assumptions 假设集合
 * @param {string[]} errors 错误集合
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function validateAssumptions(assumptions, errors) {
  validateCollection(assumptions, 'assumptions', errors);
  if (!Array.isArray(assumptions)) {
    return;
  }
  assumptions.forEach((assumption) => {
    if (!['open', 'resolved', 'blocked'].includes(assumption.status)) {
      errors.push('assumption.status 无效');
    }
  });
}
