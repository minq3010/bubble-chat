function summarizeMemoryMetrics(metrics) {
  const groups = new Map()
  let totalKB = 0

  for (const metric of metrics) {
    const kb = metric.memory?.workingSetSize || 0
    totalKB += kb
    const name = metric.type === "Utility" ? metric.name : undefined
    const key = `${metric.type}:${name || ""}`
    const current = groups.get(key) || { type: metric.type, name, kb: 0 }
    current.kb += kb
    groups.set(key, current)
  }

  return {
    totalMB: Math.max(1, Math.round(totalKB / 1024)),
    processCount: metrics.length,
    metrics: Array.from(groups.values())
      .map(({ type, name, kb }) => ({
        type,
        ...(name ? { name } : {}),
        mb: Math.round(kb / 1024),
      }))
      .sort((a, b) => b.mb - a.mb),
  }
}

module.exports = { summarizeMemoryMetrics }
