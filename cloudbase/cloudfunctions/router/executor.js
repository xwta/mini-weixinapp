const { agents, pickExecutableAgents } = require('./agents')

async function executeWorkflow(ctx, tools) {
  const names = pickExecutableAgents(ctx.workflow)

  let lastResult = null
  const executionLog = []

  for (const name of names) {
    const agent = agents[name]
    if (!agent) continue

    try {
      const result = await agent.run(ctx, tools)

      executionLog.push({
        agent: name,
        status: result?.code === 0 ? 'success' : 'failed',
      })

      if (result?.code === 0 && result?.data) {
        lastResult = result
      }
    } catch (error) {
      executionLog.push({
        agent: name,
        status: 'failed',
        message: error?.message || 'agent error',
      })
    }
  }

  return {
    result: lastResult || {
      code: 0,
      data: {
        message: '工作流已完成',
      },
    },
    executionLog,
  }
}

module.exports = {
  executeWorkflow,
}
