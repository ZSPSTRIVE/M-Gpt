<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { platformApi } from './services/platformApi'

const isSidebarCollapsed = ref(false)
const isModelMenuOpen = ref(false)
const isAttachmentMenuOpen = ref(false)
const isMicActive = ref(false)
const selectedModel = ref('Instant')
const activeNav = ref('new-chat')
const activeConversationId = ref(null)
const composerText = ref('')
const knowledgeEnabled = ref(false)
const selectedAttachmentIds = ref([])
const drawerMode = ref(null)
const settingsTab = ref('models')
const accountTab = ref('account')
const authMode = ref('activate')
const skills = ref([])
const ragSources = ref([])
const invites = ref([])
const adminOverview = ref({ activatedUsers: 0, inviteBalance: 0, monthlyMessages: 0, ragQueries: 0 })
const apiConfig = ref({ baseUrl: '', streamEndpoint: '', ragEndpoint: '', skillEndpoint: '', authEndpoint: '' })
const ragConfig = ref({ provider: '', vectorStore: '', embeddingModel: '', reranker: '', topK: 0, chunkSize: 0, chunkOverlap: 0 })
const workspaceStatus = ref('未激活')
const statusMessage = ref('前端已预留 Python API / RAG / Skills / Admin 接入位。')
const authModalOpen = ref(false)
const showScrollToBottom = ref(false)
const recentMenuChatId = ref(null)
const renamingChatId = ref(null)
const renameDraft = ref('')
const modelTriggerRef = ref(null)
const modelMenuRef = ref(null)
const attachmentTriggerRef = ref(null)
const attachmentMenuRef = ref(null)
const chatStageRef = ref(null)

const activationForm = reactive({ inviteCode: 'GOGO-2026-ALPHA', email: 'ops@gogoteam.ai' })
const loginForm = reactive({ inviteCode: 'GOGO-2026-ALPHA', email: 'admin@gogoteam.ai', password: '' })
const accountProfile = reactive({
  name: 'Shanglu Admin',
  email: 'admin@gogoteam.ai',
  role: '管理员',
  workspace: 'GoGoTeam20260304',
  plan: 'Business',
  memory: true,
  webAccess: true,
})
const promptSettings = reactive({
  aboutUser: '我主要用这个系统处理研发、运维、知识库和业务流程自动化任务。',
  responseStyle: '优先给出可执行结论，必要时补充结构化步骤、风险和下一步。',
  systemPrompt: '你是企业内部 AI 工作台，默认遵循权限边界、优先使用知识库与技能链路。',
})

const models = [
  { name: 'Instant', desc: '适用于日常聊天', placeholder: '有问题，尽管问' },
  { name: 'Thinking', desc: '适用于解答复杂问题', placeholder: '输入一个复杂问题，我会逐步拆解' },
  { name: 'Pro', desc: '研究级智能模型', placeholder: '输入研究任务，获取更强推理支持' },
]

const navItems = [
  { id: 'new-chat', label: '新聊天', icon: 'edit' },
  { id: 'search-chat', label: '搜索聊天', icon: 'search' },
  { id: 'library', label: '库', icon: 'library' },
  { id: 'apps', label: '应用', icon: 'apps' },
  { id: 'research', label: '深度研究', icon: 'research' },
]

const attachmentOptions = [
  { id: 'upload', label: '上传文件', desc: 'PDF、Word、表格', icon: 'upload' },
  { id: 'image', label: '添加图片', desc: '用于视觉理解', icon: 'image' },
  { id: 'screenshot', label: '截图内容', desc: '快速附加当前素材', icon: 'screen' },
]

const libraryCollections = [
  { id: 'lib-1', name: '销售话术', meta: '124 份文档' },
  { id: 'lib-2', name: '研发规范', meta: '79 条规则' },
  { id: 'lib-3', name: '客服 SOP', meta: '43 个流程' },
]

const appCards = [
  { id: 'app-rag', name: 'RAG Studio', desc: '调试检索、召回、重排链路' },
  { id: 'app-skill', name: 'Skill Center', desc: '安装、启停与编排技能流' },
  { id: 'app-admin', name: 'Admin Console', desc: '成员、邀请码、计费与审计' },
]

const researchSteps = ['多轮问题澄清', '检索知识库与外部源', '证据去重与摘要聚合', '结构化研究报告输出']

const createAssistantMessage = (text, model, extra = {}) => ({
  role: 'assistant',
  text,
  model,
  variantKey: extra.variantKey ?? 'general',
  regeneratedAt: extra.regeneratedAt ?? null,
})

const recentChats = ref([
  {
    id: 'resume',
    title: '简历完善建议',
    messages: [
      { role: 'user', text: '我想把简历里的项目经历写得更专业一点。' },
      createAssistantMessage(
        '我先给你一个直接可用的写法：\n\n1. 每段项目经历只保留“动作 + 结果 + 量化指标”。\n2. 用主动动词开头，避免“负责、参与”这种弱表达。\n3. 如果有业务结果，优先写成效率提升、成本下降、交付周期缩短。\n\n如果你愿意，我下一条可以直接把你的原始经历改成可投递版本。',
        'Instant',
      ),
    ],
  },
  {
    id: 'mobaxterm',
    title: 'MobaXterm SSH连接问题',
    messages: [
      { role: 'user', text: 'MobaXterm 连服务器一直超时，要从哪些地方排查？' },
      createAssistantMessage(
        '建议按这个顺序排查：\n\n一、先确认本地到目标 IP 是否可达。\n二、再确认 22 端口或自定义端口是否开放。\n三、最后检查服务端 `sshd`、密钥权限和白名单策略。\n\n如果你愿意，我下一条可以直接给你逐步排障清单。',
        'Thinking',
        { variantKey: 'ops' },
      ),
    ],
  },
  {
    id: 'points',
    title: '积分消耗计算',
    messages: [
      { role: 'user', text: '帮我算一下 1.2 万积分够用多久。' },
      createAssistantMessage(
        '要先把问题拆成三层：\n\n1. 单次请求消耗多少积分。\n2. 每天预计调用多少次。\n3. 输入和输出比例是否波动。\n\n你把平均输入 / 输出 token 和日均请求量给我，我可以直接给你一张消耗周期表。',
        'Pro',
        { variantKey: 'cost' },
      ),
    ],
  },
])

const replyGroups = {
  ui: {
    Instant: [
      ({ topic, context }) => `${context}围绕“${topic}”，先做增量修复：\n\n- 把消息区最大宽度收紧。\n- 统一输入框和消息卡片的圆角、描边、hover。\n- 收敛工具按钮，只保留高频项。\n\n这样改动小，但体验会立刻更像成熟 AI 产品。`,
      ({ topic, context }) => `${context}这个问题不要大改结构，先修 4 个点：\n\n1. 标题和正文的间距节奏。\n2. 消息容器的横向宽度。\n3. 用户消息和助手消息的层级区分。\n4. 输入区按钮的统一性。`,
    ],
    Thinking: [
      ({ topic, context }) => `${context}我先把“${topic}”拆成三个层面：\n\n一、结构层：消息区、输入区、顶部栏形成单一阅读轴。\n二、视觉层：行高、圆角、留白要统一。\n三、交互层：发送、重答、回到底部都要放在用户预期位置。`,
      ({ topic, context }) => `${context}更稳妥的做法不是重写，而是逐层收敛“${topic}”：\n\n- 先修消息区与输入区关系。\n- 再统一回答排版层级。\n- 最后补按钮反馈和状态表现。`,
    ],
    Pro: [
      ({ topic, context }) => `${context}下面按产品级方式处理“${topic}”：\n\n一、视觉约束：最大阅读宽度稳定，回答区使用轻容器感。\n二、交互约束：消息保留模型名，支持不同模型重答。\n三、工程约束：后续接 Python / LangChain / RAG 时不改渲染结构。`,
      ({ topic, context }) => `${context}从交付角度看，“${topic}”建议三步走：\n\n1. 补齐消息元数据，至少记录模型和重答状态。\n2. 让回答区更适合长文本阅读。\n3. 支持横向比较不同模型输出。`,
    ],
  },
  ops: {
    Instant: [
      ({ topic, context }) => `${context}针对“${topic}”，先做快速排查：\n\n- 先看网络是否可达。\n- 再看端口是否开放。\n- 最后看服务端配置和权限。`,
      ({ topic, context }) => `${context}这类 SSH 问题最常见不是客户端，而是网络链路或服务端策略。\n\n建议按“网络 → 端口 → 服务 → 权限”顺序排。`,
    ],
    Thinking: [
      ({ topic, context }) => `${context}我先把“${topic}”拆成一条排障路径：\n\n一、链路可达性：IP、DNS、端口。\n二、服务状态：sshd、监听地址、认证方式。\n三、权限策略：密钥权限、白名单、风控封禁。`,
      ({ topic, context }) => `${context}如果系统排查“${topic}”，建议把现象分成两类：\n\n- 连接前失败：大概率是网络或端口。\n- 建连后失败：大概率是认证、权限或服务端策略。`,
    ],
    Pro: [
      ({ topic, context }) => `${context}从工程角度处理“${topic}”，建议形成标准排障模板：\n\n1. 环境信息\n2. 现象归类\n3. 证据采集\n4. 根因与修复项`,
      ({ topic, context }) => `${context}这类问题后面很适合做成 Skills：自动执行网络连通性检查、采集 SSH 配置与日志、生成排障结论。`,
    ],
  },
  rag: {
    Instant: [
      ({ topic, context }) => `${context}关于“${topic}”，先给你直接结论：\n\nRAG 不要一上来堆模型，优先把知识清洗、切片、召回和权限过滤做稳。`,
      ({ topic, context }) => `${context}这类知识库问题，建议先看三件事：文档是否干净、chunk 是否合理、检索结果是否真的相关。`,
    ],
    Thinking: [
      ({ topic, context }) => `${context}我先把“${topic}”拆成典型 RAG 链路：\n\n文档入库 → 清洗切片 → 向量检索 → 重排 → 上下文压缩 → 模型生成。`,
      ({ topic, context }) => `${context}从调参顺序看，“${topic}”建议先定数据，再定检索，最后才定模型。`,
    ],
    Pro: [
      ({ topic, context }) => `${context}如果后续要把“${topic}”落到企业场景，我建议按能力层拆分：数据层、索引层、编排层、应用层。`,
      ({ topic, context }) => `${context}从可运营角度看，“${topic}”至少要具备三种可观察性：召回命中率、重排前后差异、最终回答依赖的证据链。`,
    ],
  },
  cost: {
    Instant: [
      ({ topic, context }) => `${context}“${topic}”这种问题，最快的算法是：\n\n总积分 ÷ 单次消耗 ÷ 日均请求量。`,
      ({ topic, context }) => `${context}先别直接问够用多久，先把成本公式定住：单次成本 = 输入成本 + 输出成本 + 额外工具调用成本。`,
    ],
    Thinking: [
      ({ topic, context }) => `${context}我建议把“${topic}”拆成三档估算：保守、中位、激进。这样比只给一个结果更有决策价值。`,
      ({ topic, context }) => `${context}成本问题最容易忽略的是输出比例和上下文增长。`,
    ],
    Pro: [
      ({ topic, context }) => `${context}如果你要把“${topic}”做成正式预算模型，我建议至少输出四列：模型单价、输入 / 输出比例、日均请求量、月度和季度成本区间。`,
      ({ topic, context }) => `${context}从平台侧看，积分预算最好拆到模型、工具调用和 RAG 查询三个维度。`,
    ],
  },
  general: {
    Instant: [
      ({ topic, context }) => `${context}围绕“${topic}”，我先给你一个直接可用的版本，再按需要继续展开。`,
      ({ topic, context }) => `${context}这类问题我建议先明确三个点：目标是什么、现在卡在哪、希望最终拿到什么结果。`,
    ],
    Thinking: [
      ({ topic, context }) => `${context}我先把“${topic}”拆开理解一下：目标是什么、当前约束是什么、结果要偏建议还是执行步骤。`,
      ({ topic, context }) => `${context}如果按更稳妥的方式处理“${topic}”，建议先澄清背景，再收敛方案，再给执行步骤。`,
    ],
    Pro: [
      ({ topic, context }) => `${context}下面给你一个更完整的处理框架：\n\n一、定义目标和边界。\n二、拆关键变量和风险。\n三、给出可执行方案与后续接口预留。`,
      ({ topic, context }) => `${context}如果这个问题后续要进入系统化流程，建议从现在开始就保留结构化输出：背景、目标、约束、建议、下一步。`,
    ],
  },
}

const activeConversation = computed(() => recentChats.value.find((item) => item.id === activeConversationId.value) ?? null)
const currentModel = computed(() => models.find((item) => item.name === selectedModel.value) ?? models[0])
const composerPlaceholder = computed(() => {
  if (activeConversation.value) return `继续围绕“${activeConversation.value.title}”提问`
  if (activeNav.value === 'search-chat') return '搜索聊天记录'
  return currentModel.value.placeholder
})
const toolChips = computed(() => {
  const list = attachmentOptions.filter((item) => selectedAttachmentIds.value.includes(item.id)).map((item) => ({ id: item.id, label: item.label }))
  if (knowledgeEnabled.value) list.push({ id: 'knowledge', label: '公司知识库' })
  return list
})
const isPrimaryActionSend = computed(() => composerText.value.trim().length > 0)
const isNavActive = (id) => !activeConversationId.value && activeNav.value === id
const drawerTitle = computed(() => {
  const map = { 'search-chat': '搜索聊天', library: '库', apps: '应用中心', research: '深度研究', knowledge: 'RAG / 公司知识库', settings: '系统配置', account: '账户' }
  return drawerMode.value ? map[drawerMode.value] ?? '功能面板' : ''
})
const filteredChats = computed(() => {
  const keyword = composerText.value.trim()
  if (!keyword || drawerMode.value !== 'search-chat') return recentChats.value
  return recentChats.value.filter((item) => item.title.includes(keyword))
})
const activeConversationModels = computed(() => {
  if (!activeConversation.value) return []
  return [...new Set(activeConversation.value.messages.filter((item) => item.role === 'assistant' && item.model).map((item) => item.model))]
})

const summarizeTopic = (text) => {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  return cleaned.length > 22 ? `${cleaned.slice(0, 22)}…` : cleaned || '当前问题'
}

const detectReplyGroup = (text) => {
  const normalized = text.toLowerCase()
  if (/(ui|界面|复刻|页面|前端|vue|样式|排版|对话框|按钮|chatgpt)/.test(normalized)) return 'ui'
  if (/(ssh|服务器|连接|端口|部署|日志|mobaxterm|超时|network|网络)/.test(normalized)) return 'ops'
  if (/(rag|知识库|embedding|向量|检索|langchain|langgraph|skill|skills|召回|重排)/.test(normalized)) return 'rag'
  if (/(积分|token|成本|预算|价格|消耗|单价|比例)/.test(normalized)) return 'cost'
  return 'general'
}

const buildReplyContext = () => {
  const context = []
  if (knowledgeEnabled.value) context.push('公司知识库')
  context.push(...attachmentOptions.filter((item) => selectedAttachmentIds.value.includes(item.id)).map((item) => item.label))
  return context.length ? `已结合${context.join('、')}。` : ''
}

const buildReply = (text, modelName = selectedModel.value, conversation = activeConversation.value, seed = 0) => {
  const groupKey = detectReplyGroup(text)
  const variants = replyGroups[groupKey]?.[modelName] ?? replyGroups.general[modelName]
  const count = conversation ? conversation.messages.filter((item) => item.role === 'assistant' && item.variantKey === groupKey && item.model === modelName).length : 0
  const variant = variants[(count + seed) % variants.length]
  return { text: variant({ topic: summarizeTopic(text), context: buildReplyContext() }), model: modelName, variantKey: groupKey }
}

const toggleSidebar = () => { isSidebarCollapsed.value = !isSidebarCollapsed.value }
const openDrawer = (mode) => { drawerMode.value = mode }
const closeDrawer = () => { drawerMode.value = null }
const closeRecentMenu = () => { recentMenuChatId.value = null }
const toggleModelMenu = () => {
  isModelMenuOpen.value = !isModelMenuOpen.value
  if (isModelMenuOpen.value) isAttachmentMenuOpen.value = false
}
const toggleAttachmentMenu = () => {
  isAttachmentMenuOpen.value = !isAttachmentMenuOpen.value
  if (isAttachmentMenuOpen.value) isModelMenuOpen.value = false
}
const selectModel = (name) => {
  selectedModel.value = name
  isModelMenuOpen.value = false
  statusMessage.value = `默认回复模型已切换为 ${name}。`
}
const toggleKnowledge = () => {
  knowledgeEnabled.value = !knowledgeEnabled.value
  drawerMode.value = knowledgeEnabled.value ? 'knowledge' : drawerMode.value === 'knowledge' ? null : drawerMode.value
}
const toggleMic = () => { isMicActive.value = !isMicActive.value }
const toggleAttachment = (id) => {
  if (selectedAttachmentIds.value.includes(id)) selectedAttachmentIds.value = selectedAttachmentIds.value.filter((item) => item !== id)
  else selectedAttachmentIds.value = [...selectedAttachmentIds.value, id]
  isAttachmentMenuOpen.value = false
}
const removeToolChip = (id) => {
  if (id === 'knowledge') knowledgeEnabled.value = false
  else selectedAttachmentIds.value = selectedAttachmentIds.value.filter((item) => item !== id)
}
const toggleRecentMenu = (id) => { recentMenuChatId.value = recentMenuChatId.value === id ? null : id }
const startRenameChat = (chat) => {
  renamingChatId.value = chat.id
  renameDraft.value = chat.title
  recentMenuChatId.value = null
}
const cancelRenameChat = () => {
  renamingChatId.value = null
  renameDraft.value = ''
}
const commitRenameChat = (id) => {
  const nextTitle = renameDraft.value.trim()
  if (!nextTitle) return cancelRenameChat()
  const chat = recentChats.value.find((item) => item.id === id)
  if (!chat) return
  chat.title = nextTitle
  statusMessage.value = `聊天记录已重命名为“${nextTitle}”。`
  cancelRenameChat()
}
const deleteChat = (id) => {
  const target = recentChats.value.find((item) => item.id === id)
  recentChats.value = recentChats.value.filter((item) => item.id !== id)
  if (activeConversationId.value === id) startNewChat()
  recentMenuChatId.value = null
  statusMessage.value = target ? `聊天记录“${target.title}”已删除。` : '聊天记录已删除。'
}
const moveChatToTop = (id) => {
  const index = recentChats.value.findIndex((item) => item.id === id)
  if (index <= 0) return
  const [chat] = recentChats.value.splice(index, 1)
  recentChats.value.unshift(chat)
}
const startNewChat = () => {
  activeConversationId.value = null
  activeNav.value = 'new-chat'
  composerText.value = ''
  selectedAttachmentIds.value = []
  isMicActive.value = false
  cancelRenameChat()
  closeRecentMenu()
  closeDrawer()
}
const activateNav = (id) => {
  if (id === 'new-chat') return startNewChat()
  activeConversationId.value = null
  activeNav.value = id
  openDrawer(id)
}
const openConversation = (id) => {
  activeConversationId.value = id
  activeNav.value = 'new-chat'
  isModelMenuOpen.value = false
  isAttachmentMenuOpen.value = false
  cancelRenameChat()
  closeRecentMenu()
  closeDrawer()
}
const openSettingsDrawer = (tab = 'models') => {
  settingsTab.value = tab
  openDrawer('settings')
  isModelMenuOpen.value = false
}
const openAccountDrawer = (tab = 'account') => {
  accountTab.value = tab
  openDrawer('account')
}
const openAuthModal = (mode = 'activate') => {
  authMode.value = mode
  authModalOpen.value = true
}
const closeAuthModal = () => { authModalOpen.value = false }
const handleActivationSubmit = async () => {
  const result = await platformApi.auth.activateInviteCode(activationForm)
  workspaceStatus.value = result.workspaceStatus
  statusMessage.value = result.message
  accountTab.value = 'workspace'
  authModalOpen.value = false
}
const handleLoginSubmit = async () => {
  const result = await platformApi.auth.loginWithInvite(loginForm)
  statusMessage.value = result.message
  accountTab.value = 'account'
  authModalOpen.value = false
}
const savePromptSettings = () => { statusMessage.value = '账户提示词和个性化设置已保存。后续可直接落到 Python 后端用户配置表。' }
const toggleAccountFlag = (field) => {
  accountProfile[field] = !accountProfile[field]
  statusMessage.value = `${field === 'memory' ? '记忆能力' : '联网能力'}已${accountProfile[field] ? '开启' : '关闭'}。`
}
const toggleSkillEnabled = async (skillId) => {
  const current = skills.value.find((item) => item.id === skillId)
  if (!current) return
  current.enabled = !current.enabled
  await platformApi.skills.setEnabled({ skillId, enabled: current.enabled })
  statusMessage.value = `技能 ${current.name} 已${current.enabled ? '启用' : '停用'}。`
}
const handleCreateInvite = async (role = 'Member') => {
  const invite = await platformApi.admin.createInvite({ role })
  invites.value = [invite, ...invites.value]
  adminOverview.value = { ...adminOverview.value, inviteBalance: adminOverview.value.inviteBalance + 1 }
  statusMessage.value = `已创建邀请码 ${invite.code}。`
}
const bootstrapPlatform = async () => {
  const [bootstrap, skillList, sourceList, inviteList, overview, ragCfg, apiCfg] = await Promise.all([
    platformApi.bootstrap(),
    platformApi.skills.list(),
    platformApi.rag.listSources(),
    platformApi.admin.listInvites(),
    platformApi.admin.getOverview(),
    platformApi.rag.getConfig(),
    platformApi.settings.getApiConfig(),
  ])
  skills.value = skillList
  ragSources.value = sourceList
  invites.value = inviteList
  adminOverview.value = overview
  ragConfig.value = ragCfg
  apiConfig.value = apiCfg
  workspaceStatus.value = '已激活'
  statusMessage.value = `前端页面已就绪。后续可按 ${bootstrap.apiConfig.authEndpoint}、${bootstrap.apiConfig.ragEndpoint} 等接口由 Python 服务接入。`
}
const ensureConversation = async () => {
  if (activeConversation.value) return activeConversation.value
  const text = composerText.value.trim()
  const title = text.length > 16 ? `${text.slice(0, 16)}...` : text || '新对话'
  const session = await platformApi.chat.reserveSession()
  const id = `chat-${session.sessionId}`
  const conversation = { id, title, messages: [], sessionId: session.sessionId }
  recentChats.value = [conversation, ...recentChats.value]
  activeConversationId.value = id
  return conversation
}
const sendMessage = async () => {
  const text = composerText.value.trim()
  if (!text) return
  const conversation = await ensureConversation()
  const reply = buildReply(text, selectedModel.value, conversation)
  conversation.messages.push({ role: 'user', text, tools: toolChips.value.map((item) => item.label) })
  conversation.messages.push(createAssistantMessage(reply.text, reply.model, { variantKey: reply.variantKey }))
  moveChatToTop(conversation.id)
  composerText.value = ''
  selectedAttachmentIds.value = []
  isMicActive.value = false
  statusMessage.value = `已使用 ${reply.model} 生成模拟回复。`
}
const getSourceUserText = (conversation, assistantIndex) => {
  for (let index = assistantIndex - 1; index >= 0; index -= 1) {
    if (conversation.messages[index]?.role === 'user') return conversation.messages[index].text
  }
  return ''
}
const regenerateAssistantMessage = async (conversationId, assistantIndex, modelName = selectedModel.value) => {
  const conversation = recentChats.value.find((item) => item.id === conversationId)
  if (!conversation) return
  const message = conversation.messages[assistantIndex]
  if (!message || message.role !== 'assistant') return
  const sourceText = getSourceUserText(conversation, assistantIndex)
  if (!sourceText) return
  const reply = buildReply(sourceText, modelName, conversation, assistantIndex + 1)
  conversation.messages.splice(assistantIndex, 1, createAssistantMessage(reply.text, reply.model, { variantKey: reply.variantKey, regeneratedAt: Date.now() }))
  selectedModel.value = modelName
  moveChatToTop(conversation.id)
  statusMessage.value = `已用 ${modelName} 重新生成这条回复。`
  await scrollChatToBottom('smooth')
}
const copyMessage = async (message) => {
  try {
    if (!navigator?.clipboard?.writeText) return (statusMessage.value = '当前环境不支持剪贴板接口。')
    await navigator.clipboard.writeText(message.text)
    statusMessage.value = `${message.role === 'assistant' ? '回复' : '消息'}已复制。`
  } catch {
    statusMessage.value = '复制失败，请检查浏览器权限。'
  }
}
const scrollChatToBottom = async (behavior = 'auto') => {
  await nextTick()
  const container = chatStageRef.value
  if (!container) return
  container.scrollTo({ top: container.scrollHeight, behavior })
  showScrollToBottom.value = false
}
const handleChatScroll = () => {
  const container = chatStageRef.value
  if (!container) return
  const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
  showScrollToBottom.value = distanceFromBottom > 120
}
const shareConversation = () => {
  if (!activeConversation.value) return
  statusMessage.value = `“${activeConversation.value.title}” 的分享接口已预留，后续可接后端生成分享链接。`
}
const openConversationActions = () => { statusMessage.value = '会话更多操作已预留，可接归档、导出、复制链接等后端能力。' }
const handlePrimaryAction = async () => {
  if (isPrimaryActionSend.value) return sendMessage()
  isMicActive.value = !isMicActive.value
}
const handleComposerKeydown = async (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    await sendMessage()
  }
}
const handlePointerDown = (event) => {
  const target = event.target
  if (isModelMenuOpen.value && !modelTriggerRef.value?.contains(target) && !modelMenuRef.value?.contains(target)) isModelMenuOpen.value = false
  if (isAttachmentMenuOpen.value && !attachmentTriggerRef.value?.contains(target) && !attachmentMenuRef.value?.contains(target)) isAttachmentMenuOpen.value = false
  if (recentMenuChatId.value && !target.closest('.recent-actions-menu') && !target.closest('.recent-more-btn')) recentMenuChatId.value = null
}
const handleKeydown = (event) => {
  if (event.key !== 'Escape') return
  if (authModalOpen.value) authModalOpen.value = false
  else if (drawerMode.value) drawerMode.value = null
  isModelMenuOpen.value = false
  isAttachmentMenuOpen.value = false
}

onMounted(() => {
  bootstrapPlatform()
  window.addEventListener('pointerdown', handlePointerDown)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handlePointerDown)
  window.removeEventListener('keydown', handleKeydown)
})

watch(
  () => [activeConversationId.value, activeConversation.value?.messages.length ?? 0],
  async ([conversationId], previous = []) => {
    const prevConversationId = previous[0]
    if (!conversationId) return
    await scrollChatToBottom(prevConversationId === conversationId ? 'smooth' : 'auto')
  },
)
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar" :class="{ collapsed: isSidebarCollapsed }">
      <div class="sidebar-body">
        <div class="sidebar-header">
          <button class="brand-btn" type="button" aria-label="M-GPT">
            <img class="brand-icon" src="/favicon.svg" alt="" />
          </button>
          <button class="sidebar-toggle" type="button" @click="toggleSidebar">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
              <path d="M8.95 4.1v15.8" />
            </svg>
          </button>
        </div>

        <nav class="nav-menu">
          <button v-for="item in navItems" :key="item.id" class="nav-item" :class="{ active: isNavActive(item.id) }" type="button" @click="activateNav(item.id)">
            <svg v-if="item.icon === 'edit'" class="nav-icon" viewBox="0 0 24 24"><path d="M12.2 19.05H5.6a1.85 1.85 0 0 1-1.85-1.85V6.8A1.85 1.85 0 0 1 5.6 4.95H13" /><path d="m15.75 5.2 3.08 3.08" /><path d="m8.55 16.05 8.08-8.08a1.82 1.82 0 1 1 2.57 2.58l-8.07 8.07-3.37.7Z" /></svg>
            <svg v-else-if="item.icon === 'search'" class="nav-icon" viewBox="0 0 24 24"><circle cx="10.25" cy="10.25" r="6.45" /><path d="M15.15 15.15 20.55 20.55" /></svg>
            <svg v-else-if="item.icon === 'library'" class="nav-icon" viewBox="0 0 24 24"><path d="M4.75 5.25h2.75a1.2 1.2 0 0 1 1.2 1.2v11.1a1.2 1.2 0 0 1-1.2 1.2H4.75a1.2 1.2 0 0 1-1.2-1.2V6.45a1.2 1.2 0 0 1 1.2-1.2Z" /><path d="M10.35 5.25h2.95a1.2 1.2 0 0 1 1.2 1.2v11.1a1.2 1.2 0 0 1-1.2 1.2h-2.95a1.2 1.2 0 0 1-1.2-1.2V6.45a1.2 1.2 0 0 1 1.2-1.2Z" /><path d="m16.3 6.2 2.18-.5a1.2 1.2 0 0 1 1.44.9l1.97 8.58a1.2 1.2 0 0 1-.9 1.44l-2.18.5a1.2 1.2 0 0 1-1.44-.9L15.4 7.64a1.2 1.2 0 0 1 .9-1.44Z" /></svg>
            <svg v-else-if="item.icon === 'apps'" class="nav-icon" viewBox="0 0 24 24"><circle cx="7.25" cy="7.25" r="2.55" /><circle cx="16.75" cy="7.25" r="2.55" /><circle cx="7.25" cy="16.75" r="2.55" /><circle cx="16.75" cy="16.75" r="2.55" /></svg>
            <svg v-else class="nav-icon" viewBox="0 0 24 24"><path d="m7.1 11.35 7.15-3.4a1.58 1.58 0 0 1 2.1.74l1.08 2.2a1.58 1.58 0 0 1-.74 2.11l-7.16 3.39" /><path d="m8.35 14.2 2.1 4.6" /><path d="m4.55 18.65 3.25-1.5" /><circle cx="18.95" cy="5.35" r="1.75" /></svg>
            <span v-if="!isSidebarCollapsed">{{ item.label }}</span>
          </button>
        </nav>

        <section v-if="!isSidebarCollapsed" class="recent-section">
          <div class="section-title">最近</div>
          <div class="recent-list">
            <div v-for="chat in recentChats" :key="chat.id" class="recent-entry" :class="{ active: activeConversationId === chat.id }">
              <div v-if="renamingChatId === chat.id" class="recent-rename-row">
                <input
                  v-model="renameDraft"
                  class="recent-rename-input"
                  maxlength="60"
                  @keydown.enter.prevent="commitRenameChat(chat.id)"
                  @keydown.esc.prevent="cancelRenameChat"
                  @blur="commitRenameChat(chat.id)"
                />
              </div>
              <template v-else>
                <button class="recent-item" :class="{ active: activeConversationId === chat.id }" type="button" @click="openConversation(chat.id)">
                  <span class="recent-item-label">{{ chat.title }}</span>
                </button>
                <button class="recent-more-btn" type="button" @click.stop="toggleRecentMenu(chat.id)">
                  <svg viewBox="0 0 24 24"><circle cx="6.5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="17.5" cy="12" r="1.5" /></svg>
                </button>
                <div v-if="recentMenuChatId === chat.id" class="recent-actions-menu" @click.stop>
                  <button class="recent-action-btn" type="button" @click="startRenameChat(chat)">重命名</button>
                  <button class="recent-action-btn danger" type="button" @click="deleteChat(chat.id)">删除</button>
                </div>
              </template>
            </div>
          </div>
        </section>
      </div>

      <div v-if="!isSidebarCollapsed" class="sidebar-footer">
        <button class="workspace-card" type="button" @click="openAccountDrawer('account')">
          <div class="avatar">S</div>
          <div>
            <div class="workspace-name">{{ accountProfile.name }}</div>
            <div class="workspace-meta">{{ accountProfile.role }} · {{ accountProfile.plan }}</div>
          </div>
        </button>
        <button class="invite-btn" type="button" @click="openAuthModal('login')">
          <svg class="invite-icon" viewBox="0 0 24 24"><circle cx="8" cy="12" r="3.1" /><path d="M11.2 12H21" /><path d="m18.1 8.9 3.1 3.1-3.1 3.1" /></svg>
          邀请码登录 / 激活
        </button>
      </div>
    </aside>

    <main class="main-pane">
      <header class="topbar" :class="{ compact: !!activeConversation }">
        <div class="model-area">
          <button ref="modelTriggerRef" class="model-trigger" type="button" @click="toggleModelMenu">
            <span class="model-label">M-GPT</span>
            <svg class="model-chevron" viewBox="0 0 24 24"><path d="m6.5 9.4 5.5 5.2 5.5-5.2" /></svg>
            <span class="model-dot"></span>
          </button>
          <div v-if="isModelMenuOpen" ref="modelMenuRef" class="model-dropdown">
            <div class="dropdown-header">最新</div>
            <button v-for="item in models" :key="item.name" class="dropdown-option" :class="{ selected: selectedModel === item.name }" type="button" @click="selectModel(item.name)">
              <div>
                <div class="option-title">{{ item.name }}</div>
                <div class="option-desc">{{ item.desc }}</div>
              </div>
              <svg v-if="selectedModel === item.name" class="option-check" viewBox="0 0 24 24"><path d="m5.4 12.55 4.15 4.1 9.05-10.2" /></svg>
            </button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-config" type="button" @click="openSettingsDrawer('models')">配置...</button>
            <div class="dropdown-footer">
              <div class="dropdown-note">已达到限额。请向你的管理员发送请求以获取访问权限</div>
              <button class="notify-btn" type="button" @click="openAccountDrawer('admin')">通知管理员</button>
            </div>
          </div>
        </div>

        <div v-if="activeConversation" class="topbar-actions">
          <button class="ghost-btn" type="button" @click="shareConversation">分享</button>
          <button class="icon-btn" type="button" @click="openConversationActions">
            <svg viewBox="0 0 24 24"><circle cx="6.5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="17.5" cy="12" r="1.5" /></svg>
          </button>
        </div>
      </header>

      <section v-if="activeConversation" ref="chatStageRef" class="chat-stage" @scroll="handleChatScroll">
        <div class="chat-thread">
          <div class="chat-title">{{ activeConversation.title }}</div>
          <div class="chat-subtitle">
            默认模型 {{ selectedModel }} · 对话已使用 {{ activeConversationModels.join(' / ') || selectedModel }} · {{ knowledgeEnabled ? '已连接公司知识库' : '标准对话' }}
          </div>

          <div class="message-list">
            <div v-for="(message, index) in activeConversation.messages" :key="`${activeConversation.id}-${index}`" class="message-row" :class="message.role">
              <div class="message-avatar">{{ message.role === 'assistant' ? 'AI' : '你' }}</div>
              <div class="message-card" :class="{ user: message.role === 'user' }">
                <div v-if="message.role === 'assistant'" class="message-head">
                  <div class="message-author">M-GPT</div>
                  <div class="message-head-right">
                    <span class="model-chip">{{ message.model }}</span>
                    <span v-if="message.regeneratedAt" class="state-chip">已重答</span>
                  </div>
                </div>
                <div class="message-text">{{ message.text }}</div>
                <div v-if="message.tools?.length" class="message-tools">
                  <span v-for="tool in message.tools" :key="tool" class="tool-pill">{{ tool }}</span>
                </div>
                <div v-if="message.role === 'assistant'" class="message-actions">
                  <button class="action-pill" type="button" @click="copyMessage(message)">复制</button>
                  <button class="action-pill" type="button" @click="regenerateAssistantMessage(activeConversation.id, index)">按当前模型重答</button>
                </div>
                <div v-if="message.role === 'assistant'" class="model-switchers">
                  <button
                    v-for="item in models"
                    :key="`${activeConversation.id}-${index}-${item.name}`"
                    class="model-option"
                    :class="{ active: message.model === item.name }"
                    type="button"
                    @click="regenerateAssistantMessage(activeConversation.id, index, item.name)"
                  >
                    用 {{ item.name }} 重答
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-else class="hero-stage">
        <h1 class="hero-title">准备好了，随时开始</h1>
      </section>

      <div class="composer-layout" :class="{ chat: !!activeConversation }">
        <button v-if="activeConversation && showScrollToBottom" class="scroll-bottom-btn" type="button" @click="scrollChatToBottom('smooth')">
          <svg viewBox="0 0 24 24"><path d="m6.8 9.4 5.2 5.2 5.2-5.2" /></svg>
        </button>

        <div v-if="toolChips.length" class="tool-chip-row">
          <button v-for="chip in toolChips" :key="chip.id" class="tool-chip" type="button" @click="removeToolChip(chip.id)">
            <span>{{ chip.label }}</span>
            <svg viewBox="0 0 24 24"><path d="m7 7 10 10" /><path d="M17 7 7 17" /></svg>
          </button>
        </div>

        <div class="composer-wrap">
          <div v-if="isAttachmentMenuOpen" ref="attachmentMenuRef" class="attachment-menu">
            <button v-for="option in attachmentOptions" :key="option.id" class="attachment-option" :class="{ active: selectedAttachmentIds.includes(option.id) }" type="button" @click="toggleAttachment(option.id)">
              <div class="attachment-icon">
                <svg v-if="option.icon === 'upload'" viewBox="0 0 24 24"><path d="M12 16.8V6.4" /><path d="m8.3 10.1 3.7-3.7 3.7 3.7" /><path d="M5.2 18.2h13.6" /></svg>
                <svg v-else-if="option.icon === 'image'" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m8 17 3.5-3.5 2.5 2.5 2.8-2.8L20 16.2" /></svg>
                <svg v-else viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="12" rx="2.4" /><path d="M8.5 20h7" /><path d="M12 16v4" /></svg>
              </div>
              <div class="attachment-copy">
                <div class="attachment-title">{{ option.label }}</div>
                <div class="attachment-desc">{{ option.desc }}</div>
              </div>
            </button>
          </div>

          <div class="composer">
            <button ref="attachmentTriggerRef" class="composer-icon-btn" :class="{ active: isAttachmentMenuOpen || selectedAttachmentIds.length > 0 }" type="button" @click="toggleAttachmentMenu">
              <svg viewBox="0 0 24 24"><path d="M12 5.2v13.6" /><path d="M5.2 12h13.6" /></svg>
            </button>
            <input v-model="composerText" class="composer-input" :placeholder="composerPlaceholder" @keydown="handleComposerKeydown" />
            <div class="composer-actions">
              <button class="icon-btn mic" :class="{ active: isMicActive }" type="button" @click="toggleMic">
                <svg viewBox="0 0 24 24"><path d="M12 3.2a2.95 2.95 0 0 0-2.95 2.95v5.7a2.95 2.95 0 0 0 5.9 0v-5.7A2.95 2.95 0 0 0 12 3.2Z" /><path d="M18.8 10.75v1.25a6.8 6.8 0 1 1-13.6 0v-1.25" /><path d="M12 18.8v2.9" /><path d="M8.95 21.7h6.1" /></svg>
              </button>
              <button class="primary-btn" :class="{ send: isPrimaryActionSend }" type="button" @click="handlePrimaryAction">
                <svg v-if="isPrimaryActionSend" viewBox="0 0 24 24"><path d="M12 19.1V6.1" /><path d="m6.4 11.7 5.6-5.6 5.6 5.6" /></svg>
                <svg v-else viewBox="0 0 24 24"><rect x="5.1" y="8.2" width="2.2" height="7.6" rx="1.1" /><rect x="10.9" y="5.4" width="2.2" height="13.2" rx="1.1" /><rect x="16.7" y="7.1" width="2.2" height="9.8" rx="1.1" /></svg>
              </button>
            </div>
          </div>
        </div>

        <button class="knowledge-btn" :class="{ active: knowledgeEnabled }" type="button" @click="toggleKnowledge">
          <svg viewBox="0 0 24 24"><circle cx="6.15" cy="12.65" r="2.1" /><circle cx="17.95" cy="7.6" r="2.1" /><circle cx="17.95" cy="17.2" r="2.1" /><path d="m8.05 11.6 7.95-3.95" /><path d="m8.1 13.45 7.9 2.95" /></svg>
          公司知识库
        </button>
      </div>

      <aside v-if="drawerMode" class="drawer">
        <div class="drawer-head">
          <div>
            <div class="drawer-title">{{ drawerTitle }}</div>
            <div class="drawer-subtitle">{{ statusMessage }}</div>
          </div>
          <button class="icon-btn" type="button" @click="closeDrawer">
            <svg viewBox="0 0 24 24"><path d="m7 7 10 10" /><path d="M17 7 7 17" /></svg>
          </button>
        </div>

        <div class="drawer-body">
          <template v-if="drawerMode === 'search-chat'">
            <button v-for="chat in filteredChats" :key="chat.id" class="surface-item" type="button" @click="openConversation(chat.id)">
              <div>{{ chat.title }}</div>
              <div class="muted">{{ chat.messages.length }} 条消息</div>
            </button>
          </template>

          <template v-else-if="drawerMode === 'library'">
            <div v-for="item in libraryCollections" :key="item.id" class="surface-card">
              <div class="surface-title">{{ item.name }}</div>
              <div class="muted">{{ item.meta }}</div>
            </div>
          </template>

          <template v-else-if="drawerMode === 'apps'">
            <button v-for="app in appCards" :key="app.id" class="surface-card left" type="button" @click="app.id === 'app-admin' ? openAccountDrawer('admin') : openSettingsDrawer(app.id === 'app-skill' ? 'skills' : 'rag')">
              <div class="surface-title">{{ app.name }}</div>
              <div class="muted">{{ app.desc }}</div>
            </button>
          </template>

          <template v-else-if="drawerMode === 'research'">
            <div v-for="step in researchSteps" :key="step" class="surface-item">{{ step }}</div>
            <div class="surface-code">预留接口: POST {{ apiConfig.ragEndpoint || '/rag/query' }} /research/plan /research/report</div>
          </template>

          <template v-else-if="drawerMode === 'knowledge'">
            <div v-for="source in ragSources" :key="source.id" class="surface-item">
              <div>{{ source.name }}</div>
              <div class="muted">{{ source.type }} · {{ source.chunks }} chunks · {{ source.updatedAt }}</div>
            </div>
            <div class="surface-grid">
              <div class="surface-card"><span>Provider</span><strong>{{ ragConfig.provider }}</strong></div>
              <div class="surface-card"><span>Vector Store</span><strong>{{ ragConfig.vectorStore }}</strong></div>
              <div class="surface-card"><span>Embedding</span><strong>{{ ragConfig.embeddingModel }}</strong></div>
              <div class="surface-card"><span>Top K</span><strong>{{ ragConfig.topK }}</strong></div>
            </div>
          </template>

          <template v-else-if="drawerMode === 'settings'">
            <div class="tabs">
              <button class="tab" :class="{ active: settingsTab === 'models' }" type="button" @click="settingsTab = 'models'">模型</button>
              <button class="tab" :class="{ active: settingsTab === 'api' }" type="button" @click="settingsTab = 'api'">接口</button>
              <button class="tab" :class="{ active: settingsTab === 'rag' }" type="button" @click="settingsTab = 'rag'">RAG</button>
              <button class="tab" :class="{ active: settingsTab === 'skills' }" type="button" @click="settingsTab = 'skills'">Skills</button>
            </div>
            <div v-if="settingsTab === 'models'" class="surface-grid">
              <div class="surface-card"><span>当前模型</span><strong>{{ selectedModel }}</strong></div>
              <div class="surface-card"><span>首屏占位</span><strong>{{ currentModel.placeholder }}</strong></div>
            </div>
            <div v-else-if="settingsTab === 'api'" class="form-grid">
              <label class="field"><span>Base URL</span><input :value="apiConfig.baseUrl" readonly /></label>
              <label class="field"><span>Stream</span><input :value="apiConfig.streamEndpoint" readonly /></label>
              <label class="field"><span>RAG</span><input :value="apiConfig.ragEndpoint" readonly /></label>
              <label class="field"><span>Skills</span><input :value="apiConfig.skillEndpoint" readonly /></label>
              <label class="field"><span>Auth</span><input :value="apiConfig.authEndpoint" readonly /></label>
            </div>
            <div v-else-if="settingsTab === 'rag'" class="form-grid">
              <label class="field"><span>Chunk Size</span><input :value="ragConfig.chunkSize" readonly /></label>
              <label class="field"><span>Overlap</span><input :value="ragConfig.chunkOverlap" readonly /></label>
              <label class="field"><span>Reranker</span><input :value="ragConfig.reranker" readonly /></label>
              <label class="field"><span>Vector Store</span><input :value="ragConfig.vectorStore" readonly /></label>
            </div>
            <div v-else>
              <button v-for="skill in skills" :key="skill.id" class="surface-item" type="button" @click="toggleSkillEnabled(skill.id)">
                <div>
                  <div>{{ skill.name }}</div>
                  <div class="muted">{{ skill.desc }} · {{ skill.version }}</div>
                </div>
                <div class="switch" :class="{ active: skill.enabled }"><span></span></div>
              </button>
            </div>
          </template>

          <template v-else-if="drawerMode === 'account'">
            <div class="tabs">
              <button class="tab" :class="{ active: accountTab === 'account' }" type="button" @click="accountTab = 'account'">账户</button>
              <button class="tab" :class="{ active: accountTab === 'prompts' }" type="button" @click="accountTab = 'prompts'">提示词</button>
              <button class="tab" :class="{ active: accountTab === 'workspace' }" type="button" @click="accountTab = 'workspace'">工作区</button>
              <button class="tab" :class="{ active: accountTab === 'admin' }" type="button" @click="accountTab = 'admin'">后台</button>
            </div>

            <div v-if="accountTab === 'account'" class="surface-card">
              <div class="account-row">
                <div class="avatar large">S</div>
                <div>
                  <div class="surface-title">{{ accountProfile.name }}</div>
                  <div class="muted">{{ accountProfile.email }}</div>
                </div>
              </div>
              <div class="surface-grid">
                <div class="surface-card"><span>角色</span><strong>{{ accountProfile.role }}</strong></div>
                <div class="surface-card"><span>套餐</span><strong>{{ accountProfile.plan }}</strong></div>
                <div class="surface-card"><span>工作区</span><strong>{{ accountProfile.workspace }}</strong></div>
                <div class="surface-card"><span>状态</span><strong>{{ workspaceStatus }}</strong></div>
              </div>
              <div class="action-row">
                <button class="ghost-btn dark" type="button" @click="openSettingsDrawer('models')">设置</button>
                <button class="ghost-btn dark" type="button" @click="toggleAccountFlag('memory')">{{ accountProfile.memory ? '关闭记忆' : '开启记忆' }}</button>
                <button class="ghost-btn dark" type="button" @click="toggleAccountFlag('webAccess')">{{ accountProfile.webAccess ? '关闭联网' : '开启联网' }}</button>
              </div>
            </div>

            <div v-else-if="accountTab === 'prompts'" class="form-grid">
              <label class="field"><span>你希望系统了解你什么？</span><textarea v-model="promptSettings.aboutUser"></textarea></label>
              <label class="field"><span>你希望系统如何回应？</span><textarea v-model="promptSettings.responseStyle"></textarea></label>
              <label class="field"><span>系统提示词</span><textarea v-model="promptSettings.systemPrompt"></textarea></label>
              <button class="dark-btn" type="button" @click="savePromptSettings">保存提示词</button>
            </div>

            <div v-else-if="accountTab === 'workspace'">
              <div class="surface-grid">
                <div class="surface-card"><span>工作区状态</span><strong>{{ workspaceStatus }}</strong></div>
                <div class="surface-card"><span>激活用户</span><strong>{{ adminOverview.activatedUsers }}</strong></div>
                <div class="surface-card"><span>月消息量</span><strong>{{ adminOverview.monthlyMessages }}</strong></div>
                <div class="surface-card"><span>RAG 查询</span><strong>{{ adminOverview.ragQueries }}</strong></div>
              </div>
              <div class="action-row">
                <button class="dark-btn" type="button" @click="openAuthModal('activate')">邀请码激活</button>
                <button class="ghost-btn dark" type="button" @click="openAuthModal('login')">邀请码登录</button>
              </div>
            </div>

            <div v-else>
              <div class="action-row">
                <button class="dark-btn" type="button" @click="handleCreateInvite('Member')">生成成员邀请码</button>
                <button class="ghost-btn dark" type="button" @click="handleCreateInvite('Business Admin')">生成管理员邀请码</button>
              </div>
              <div v-for="invite in invites" :key="invite.id" class="surface-item">
                <div>{{ invite.code }}</div>
                <div class="muted">{{ invite.role }} · {{ invite.status }}</div>
              </div>
            </div>
          </template>
        </div>
      </aside>

      <div v-if="authModalOpen" class="modal-mask" @click.self="closeAuthModal">
        <div class="modal">
          <div class="drawer-head">
            <div class="drawer-title">邀请码{{ authMode === 'activate' ? '激活' : '登录' }}</div>
            <button class="icon-btn" type="button" @click="closeAuthModal">
              <svg viewBox="0 0 24 24"><path d="m7 7 10 10" /><path d="M17 7 7 17" /></svg>
            </button>
          </div>
          <div class="tabs">
            <button class="tab" :class="{ active: authMode === 'activate' }" type="button" @click="authMode = 'activate'">激活</button>
            <button class="tab" :class="{ active: authMode === 'login' }" type="button" @click="authMode = 'login'">登录</button>
          </div>
          <div v-if="authMode === 'activate'" class="form-grid">
            <label class="field"><span>邀请码</span><input v-model="activationForm.inviteCode" /></label>
            <label class="field"><span>邮箱</span><input v-model="activationForm.email" /></label>
          </div>
          <div v-else class="form-grid">
            <label class="field"><span>邀请码</span><input v-model="loginForm.inviteCode" /></label>
            <label class="field"><span>邮箱</span><input v-model="loginForm.email" /></label>
            <label class="field"><span>密码</span><input v-model="loginForm.password" type="password" placeholder="留空表示 mock 登录" /></label>
          </div>
          <div class="action-row">
            <button class="dark-btn" type="button" @click="authMode === 'activate' ? handleActivationSubmit() : handleLoginSubmit()">
              {{ authMode === 'activate' ? '立即激活' : '立即登录' }}
            </button>
          </div>
        </div>
      </div>

      <div class="status-chip">{{ statusMessage }}</div>
      <footer class="disclaimer">M-GPT 可能会出现不准确内容，涉及科研结论、实验设计与正式发表前请务必复核。</footer>
    </main>
  </div>
</template>

<style scoped>
:global(html), :global(body), :global(#app) {
  margin: 0;
  width: 100%;
  height: 100%;
  min-width: 1280px;
  min-height: 100vh;
  overflow: hidden;
  background: #fff;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #111827;
}

* { box-sizing: border-box; }
button, input, textarea { font: inherit; }
button { border: 0; background: transparent; padding: 0; color: inherit; }

.app-shell { display: flex; width: 100vw; height: 100vh; background: #fff; }
.sidebar {
  position: relative;
  width: 352px;
  flex: 0 0 352px;
  background: linear-gradient(180deg, #f8f8f8 0%, #f7f7f7 100%);
  border-right: 1px solid #ececec;
  transition: width .2s ease, flex-basis .2s ease;
}

.sidebar.collapsed { width: 84px; flex-basis: 84px; }
.sidebar-body { height: 100%; padding: 18px 20px 148px 20px; overflow: hidden; }
.sidebar.collapsed .sidebar-body { padding-left: 14px; padding-right: 14px; }
.sidebar-header, .drawer-head, .account-row, .message-head, .topbar, .topbar-actions, .composer-actions, .action-row {
  display: flex;
  align-items: center;
}

.sidebar-header, .topbar, .drawer-head { justify-content: space-between; }
.sidebar-header { margin-bottom: 24px; }
.brand-btn, .sidebar-toggle, .composer-icon-btn, .icon-btn, .scroll-bottom-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.brand-btn { width: 30px; height: 30px; color: #1e1e1e; }
.brand-icon { width: 25px; height: 25px; }
.sidebar-toggle, .icon-btn { width: 36px; height: 36px; border-radius: 10px; color: #6b7280; }
.sidebar-toggle svg, .nav-icon, .invite-icon, .model-chevron, .option-check, .tool-chip svg, .composer-icon-btn svg, .knowledge-btn svg, .icon-btn svg, .scroll-bottom-btn svg {
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sidebar-toggle svg, .icon-btn svg { width: 20px; height: 20px; stroke-width: 1.9; }
.nav-menu, .recent-list, .message-list, .drawer-body, .form-grid { display: flex; flex-direction: column; }
.nav-menu { gap: 6px; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  height: 44px;
  padding: 0 2px;
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
}

.nav-item:hover, .nav-item.active, .recent-item:hover, .recent-item.active, .workspace-card:hover { background: #ececec; }
.sidebar.collapsed .nav-item { justify-content: center; gap: 0; }
.nav-icon { width: 22px; height: 22px; flex: 0 0 22px; stroke-width: 1.9; }
.sidebar.collapsed .nav-item span { display: none; }

.recent-section { margin-top: 36px; }
.section-title, .muted, .drawer-subtitle, .chat-subtitle { color: #6b7280; }
.section-title { margin-bottom: 14px; font-size: 18px; }
.recent-list { gap: 6px; }
.recent-entry { position: relative; }
.recent-item, .recent-rename-input { width: 100%; border-radius: 10px; text-align: left; }
.recent-item { padding: 8px 42px 8px 10px; font-size: 17px; line-height: 28px; }
.recent-item-label { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.recent-rename-row { padding: 2px 0; }
.recent-rename-input { height: 40px; padding: 0 12px; border: 1px solid #d4d7dd; outline: none; }

.recent-more-btn {
  position: absolute;
  top: 50%;
  right: 6px;
  width: 28px;
  height: 28px;
  transform: translateY(-50%);
  border-radius: 8px;
  opacity: 0;
}

.recent-entry:hover .recent-more-btn, .recent-entry.active .recent-more-btn { opacity: 1; }
.recent-more-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; }
.recent-actions-menu {
  position: absolute;
  top: calc(100% - 2px);
  right: 4px;
  z-index: 4;
  min-width: 112px;
  padding: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: rgba(255,255,255,.98);
  box-shadow: 0 12px 26px rgba(15,23,42,.12);
}

.recent-action-btn { width: 100%; height: 34px; padding: 0 10px; border-radius: 10px; text-align: left; }
.recent-action-btn:hover { background: #f3f4f6; }
.recent-action-btn.danger { color: #b42318; }

.sidebar-footer {
  position: absolute;
  right: 18px;
  bottom: 16px;
  left: 18px;
  padding-top: 16px;
  border-top: 1px solid #ededed;
}

.workspace-card, .invite-btn, .ghost-btn, .dark-btn, .surface-item, .surface-card, .field input, .field textarea, .tab, .action-pill, .model-option, .tool-chip {
  border: 1px solid #e5e7eb;
}

.workspace-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 8px 6px;
  border-radius: 12px;
  text-align: left;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #111827 0%, #374151 100%);
  color: #fff;
  font-weight: 700;
}

.avatar.large { width: 44px; height: 44px; font-size: 18px; }
.workspace-name { font-size: 17px; font-weight: 600; }
.workspace-meta { color: #555; font-size: 14px; }
.invite-btn, .ghost-btn, .dark-btn, .action-pill, .model-option, .tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
}

.invite-btn { gap: 8px; width: 100%; height: 46px; background: #fbfbfb; font-weight: 500; }
.invite-icon { width: 18px; height: 18px; stroke-width: 1.8; }

.main-pane {
  position: relative;
  flex: 1;
  min-height: 100vh;
  overflow: hidden;
  background: radial-gradient(circle at 76% 56%, rgba(241,246,255,.54) 0%, rgba(255,255,255,0) 24%), #fff;
}

.topbar { padding: 12px 24px 0 28px; }
.model-area { position: relative; }
.model-trigger { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
.model-label { font-size: 23px; line-height: 34px; font-weight: 700; }
.model-chevron { width: 16px; height: 16px; color: #787878; stroke-width: 2.15; }
.model-dot { width: 11px; height: 11px; margin-left: 5px; border-radius: 50%; background: #1d73cf; }
.model-dropdown {
  position: absolute;
  top: 42px;
  left: 126px;
  width: 372px;
  overflow: hidden;
  border: 1px solid #dddddc;
  border-radius: 23px;
  background: rgba(255,255,255,.98);
  box-shadow: 0 12px 28px rgba(25,25,25,.14), 0 1px 3px rgba(25,25,25,.06);
}

.dropdown-header { padding: 22px 26px 12px; color: #8b8b8b; font-size: 15px; font-weight: 600; }
.dropdown-option {
  width: 100%;
  min-height: 92px;
  padding: 10px 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
}

.dropdown-option:hover, .dropdown-option.selected { background: rgba(0,0,0,.018); }
.option-title { font-size: 20px; font-weight: 700; }
.option-desc { margin-top: 2px; color: #8f8f8f; font-size: 15px; font-weight: 600; }
.option-check { width: 24px; height: 24px; stroke-width: 2.1; }
.dropdown-divider { height: 1px; margin: 2px 16px 0; background: #e4e4e4; }
.dropdown-config { width: 100%; padding: 18px 26px; text-align: left; font-size: 18px; font-weight: 600; }
.dropdown-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 95px;
  padding: 16px 20px 18px 26px;
  border-top: 1px solid #ececec;
  background: #f8f8f8;
}

.dropdown-note { max-width: 208px; color: #6b6b6b; font-size: 15px; line-height: 22px; font-weight: 600; }
.notify-btn, .dark-btn { height: 44px; padding: 0 18px; background: #111827; color: #fff; font-weight: 600; border-radius: 999px; }
.topbar-actions { gap: 10px; }
.ghost-btn { height: 36px; padding: 0 12px; background: #fff; }
.ghost-btn.dark { border-color: #d7dbe2; }

.hero-stage { display: flex; justify-content: center; padding-top: clamp(118px, 15.2vh, 162px); }
.hero-title { margin: 0; font-size: 48px; line-height: 1.18; font-weight: 500; }
.chat-stage { height: 100%; padding: 72px 0 344px; overflow: auto; }
.chat-thread, .composer-layout { width: min(1020px, calc(100vw - 540px)); margin: 0 auto; }
.chat-title { font-size: 38px; line-height: 48px; font-weight: 600; }
.chat-subtitle { margin-top: 8px; font-size: 15px; line-height: 24px; }
.message-list { gap: 18px; margin-top: 34px; padding-bottom: 72px; }
.message-row { display: flex; gap: 14px; }
.message-row.user { flex-direction: row-reverse; }
.message-avatar {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f2f4f7;
  font-size: 13px;
  font-weight: 700;
}

.message-row.assistant .message-avatar { background: #0f1729; color: #fff; }
.message-card {
  max-width: 760px;
  padding: 14px 16px;
  border: 1px solid #e7e7e7;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(15,23,42,.04);
}

.message-card.user { background: #f3ecff; border-color: #e8dcff; }
.message-head { justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.message-author { font-size: 14px; font-weight: 700; }
.message-head-right, .message-tools, .message-actions, .model-switchers, .tool-chip-row, .tabs, .surface-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.message-text { white-space: pre-wrap; font-size: 16px; line-height: 25px; }
.message-tools, .message-actions, .model-switchers { margin-top: 12px; }
.tool-pill, .model-chip, .state-chip {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
}

.tool-pill, .state-chip { background: #f3f4f6; color: #4b5563; }
.model-chip { background: #eff4ff; color: #29468d; font-weight: 600; }
.action-pill, .model-option { height: 32px; padding: 0 12px; background: #fff; font-size: 13px; }
.model-option.active { background: #111827; color: #fff; border-color: #111827; }

.composer-layout {
  position: absolute;
  left: 50%;
  top: clamp(226px, 29.5vh, 286px);
  min-width: 860px;
  transform: translateX(-50%);
}

.composer-layout.chat { top: auto; bottom: 132px; }
.scroll-bottom-btn {
  position: absolute;
  top: -54px;
  left: 50%;
  width: 42px;
  height: 42px;
  transform: translateX(-50%);
  border: 1px solid #dedfe3;
  border-radius: 50%;
  background: rgba(255,255,255,.98);
  box-shadow: 0 10px 20px rgba(15,23,42,.08);
}

.scroll-bottom-btn svg { width: 20px; height: 20px; stroke-width: 2.2; }
.tool-chip-row { margin-bottom: 14px; }
.tool-chip { gap: 8px; height: 34px; padding: 0 12px; background: #fff; font-size: 14px; }
.tool-chip svg { width: 13px; height: 13px; stroke-width: 1.9; color: #6b7280; }
.composer-wrap { position: relative; }

.attachment-menu {
  position: absolute;
  bottom: calc(100% + 18px);
  left: 0;
  width: 320px;
  overflow: hidden;
  border: 1px solid #dddddf;
  border-radius: 20px;
  background: rgba(255,255,255,.98);
  box-shadow: 0 16px 32px rgba(15,23,42,.12);
}

.attachment-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  text-align: left;
}

.attachment-option + .attachment-option { border-top: 1px solid #efefef; }
.attachment-option:hover, .attachment-option.active { background: rgba(0,0,0,.024); }
.attachment-icon {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #f4f5f7;
}

.attachment-icon svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
.attachment-title { font-size: 16px; font-weight: 600; }
.attachment-desc { margin-top: 2px; color: #7a818c; font-size: 13px; }

.composer {
  display: flex;
  align-items: center;
  height: 78px;
  padding: 0 18px 0 21px;
  border: 1px solid #d8d8d8;
  border-radius: 39px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(16,24,40,.06), 0 12px 34px rgba(17,24,39,.06);
}

.composer-icon-btn { width: 38px; height: 38px; flex: 0 0 38px; border-radius: 50%; }
.composer-icon-btn.active, .icon-btn.mic.active { background: #f1f3f5; }
.composer-icon-btn svg { width: 24px; height: 24px; stroke-width: 1.8; }
.composer-input {
  flex: 1;
  min-width: 0;
  padding: 0 20px 2px 12px;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 19px;
  line-height: 28px;
}

.composer-input::placeholder { color: #8f8f94; }
.composer-actions { gap: 12px; }
.icon-btn.mic { width: 38px; height: 38px; border-radius: 50%; }
.icon-btn.mic svg { width: 21px; height: 21px; stroke-width: 1.8; }
.primary-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #8d4cf5;
  color: #fff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.18);
}

.primary-btn.send { background: #0f1729; }
.primary-btn svg { width: 24px; height: 24px; }
.primary-btn:not(.send) svg { fill: currentColor; stroke: none; }
.primary-btn.send svg { fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2.3; }
.knowledge-btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  height: 52px;
  margin-top: 18px;
  padding: 0 22px;
  border: 1px solid #dfdfdf;
  border-radius: 26px;
  background: #fff;
  font-size: 18px;
  font-weight: 500;
}

.knowledge-btn.active { border-color: #cad5ff; background: #f7f9ff; color: #27408b; }
.knowledge-btn svg { width: 21px; height: 21px; stroke-width: 1.85; }

.drawer, .modal {
  position: absolute;
  right: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  background: rgba(255,255,255,.96);
  box-shadow: 0 22px 46px rgba(15,23,42,.12);
}

.drawer {
  top: 58px;
  bottom: 52px;
  z-index: 9;
  width: 420px;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(12px);
}

.drawer-head { gap: 16px; padding: 20px 20px 14px; border-bottom: 1px solid #eceef2; }
.drawer-title { font-size: 22px; font-weight: 700; }
.drawer-subtitle { margin-top: 4px; font-size: 13px; line-height: 20px; }
.drawer-body { flex: 1; gap: 10px; padding: 18px; overflow: auto; }
.surface-item, .surface-card { width: 100%; padding: 14px 16px; border-radius: 18px; background: #fff; }
.surface-card.left { text-align: left; }
.surface-title { font-size: 16px; font-weight: 600; }
.surface-grid { margin-top: 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.surface-grid .surface-card { display: flex; flex-direction: column; gap: 6px; padding: 14px; }
.surface-grid .surface-card span { color: #6b7280; font-size: 12px; }
.surface-grid .surface-card strong { font-size: 15px; }
.tabs { margin-bottom: 16px; }
.tab { height: 34px; padding: 0 14px; background: #f3f4f6; color: #4b5563; font-size: 13px; font-weight: 600; }
.tab.active { background: #111827; color: #fff; border-color: #111827; }
.form-grid { gap: 12px; }
.field { display: grid; gap: 8px; }
.field span { color: #6b7280; font-size: 13px; }
.field input, .field textarea { width: 100%; border-radius: 14px; padding: 0 14px; outline: none; background: #fff; }
.field input { height: 42px; }
.field textarea { min-height: 92px; padding-top: 12px; padding-bottom: 12px; resize: vertical; line-height: 22px; }
.action-row { flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.surface-code { padding: 14px 16px; border: 1px solid #eceef2; border-radius: 18px; color: #425066; white-space: pre-wrap; background: #fff; }

.switch {
  position: relative;
  width: 42px;
  height: 24px;
  flex: 0 0 42px;
  border-radius: 999px;
  background: #d1d5db;
}

.switch span {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: transform .18s ease;
}

.switch.active { background: #111827; }
.switch.active span { transform: translateX(18px); }

.modal-mask {
  position: absolute;
  inset: 0;
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15,23,42,.24);
  backdrop-filter: blur(4px);
}

.modal { position: relative; width: 420px; padding: 20px; }
.status-chip {
  position: absolute;
  left: 50%;
  bottom: 28px;
  z-index: 6;
  max-width: min(760px, calc(100vw - 520px));
  height: 32px;
  padding: 0 14px;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  border: 1px solid #eceef2;
  border-radius: 999px;
  background: rgba(255,255,255,.92);
  color: #5d6878;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.disclaimer {
  position: absolute;
  right: 0;
  bottom: 8px;
  left: 0;
  text-align: center;
  color: #56606e;
  font-size: 14px;
}

@media (max-width: 1680px) {
  .chat-thread, .composer-layout { width: min(960px, calc(100vw - 500px)); }
}

@media (max-width: 1440px) {
  .sidebar { width: 318px; flex-basis: 318px; }
  .composer-layout { min-width: 760px; width: calc(100vw - 440px); }
  .drawer { width: 360px; }
}
</style>
