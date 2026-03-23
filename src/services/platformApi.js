const wait = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms))

const state = {
  skills: [
    {
      id: 'skill-rag',
      name: 'RAG 检索增强',
      desc: '在回答前检索知识库并注入上下文',
      enabled: true,
      version: 'v0.9',
    },
    {
      id: 'skill-codex',
      name: 'Codex 执行代理',
      desc: '面向代码任务的计划、执行与审阅流',
      enabled: true,
      version: 'v0.7',
    },
    {
      id: 'skill-ops',
      name: '运维诊断',
      desc: '适合日志排查、SSH、端口与部署诊断',
      enabled: false,
      version: 'v0.3',
    },
  ],
  ragSources: [
    { id: 'kb-1', name: '公司制度库', type: 'PDF / 文档', chunks: 3241, updatedAt: '2026-03-21' },
    { id: 'kb-2', name: '研发知识库', type: 'Markdown / Wiki', chunks: 8820, updatedAt: '2026-03-22' },
    { id: 'kb-3', name: '售前资料集', type: 'PPT / PDF', chunks: 1450, updatedAt: '2026-03-20' },
  ],
  invites: [
    { id: 'inv-1', code: 'GOGO-2026-ALPHA', status: '未使用', role: 'Business Admin' },
    { id: 'inv-2', code: 'GOGO-2026-STAFF', status: '已使用', role: 'Member' },
  ],
  adminOverview: {
    activatedUsers: 18,
    inviteBalance: 42,
    monthlyMessages: 182403,
    ragQueries: 6240,
  },
  apiConfig: {
    baseUrl: 'https://api.your-domain.local/v1',
    streamEndpoint: '/chat/stream',
    ragEndpoint: '/rag/query',
    skillEndpoint: '/skills/run',
    authEndpoint: '/auth/invite/login',
  },
  ragConfig: {
    provider: 'LangChain',
    vectorStore: 'pgvector / milvus',
    embeddingModel: 'text-embedding-3-large',
    reranker: 'bge-reranker-v2',
    topK: 6,
    chunkSize: 800,
    chunkOverlap: 120,
  },
}

export const platformApi = {
  bootstrap: async () => {
    await wait()
    return JSON.parse(JSON.stringify(state))
  },

  auth: {
    activateInviteCode: async ({ inviteCode, email }) => {
      await wait(260)
      return {
        success: true,
        message: `邀请码 ${inviteCode || '未填写'} 已校验，${email || '当前用户'} 可继续激活工作区。`,
        workspaceStatus: '已激活',
      }
    },

    loginWithInvite: async ({ inviteCode, email }) => {
      await wait(220)
      return {
        success: true,
        message: `${email || '当前账户'} 已通过邀请码 ${inviteCode || '未填写'} 登录。`,
        tokenType: 'mock-session',
      }
    },
  },

  chat: {
    reserveSession: async () => {
      await wait()
      return {
        sessionId: `session-${Date.now()}`,
        streamProtocol: 'sse',
      }
    },
  },

  skills: {
    list: async () => {
      await wait()
      return JSON.parse(JSON.stringify(state.skills))
    },

    setEnabled: async ({ skillId, enabled }) => {
      await wait()
      const target = state.skills.find((item) => item.id === skillId)
      if (target) target.enabled = enabled
      return { success: true, skillId, enabled }
    },
  },

  rag: {
    listSources: async () => {
      await wait()
      return JSON.parse(JSON.stringify(state.ragSources))
    },

    getConfig: async () => {
      await wait()
      return JSON.parse(JSON.stringify(state.ragConfig))
    },
  },

  admin: {
    getOverview: async () => {
      await wait()
      return JSON.parse(JSON.stringify(state.adminOverview))
    },

    listInvites: async () => {
      await wait()
      return JSON.parse(JSON.stringify(state.invites))
    },

    createInvite: async ({ role }) => {
      await wait(260)
      const code = `GOGO-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
      const invite = {
        id: `inv-${Date.now()}`,
        code,
        status: '未使用',
        role: role || 'Member',
      }
      state.invites.unshift(invite)
      state.adminOverview.inviteBalance += 1
      return JSON.parse(JSON.stringify(invite))
    },
  },

  settings: {
    getApiConfig: async () => {
      await wait()
      return JSON.parse(JSON.stringify(state.apiConfig))
    },
  },
}
