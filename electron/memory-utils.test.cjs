const assert = require("node:assert/strict")
const { summarizeMemoryMetrics } = require("./memory-utils.cjs")

const result = summarizeMemoryMetrics([
  { type: "Browser", memory: { workingSetSize: 1024 } },
  { type: "Tab", memory: { workingSetSize: 2048 } },
  { type: "Tab", memory: { workingSetSize: 1024 } },
])

assert.equal(result.totalMB, 4)
assert.equal(result.processCount, 3)
assert.deepEqual(result.metrics, [
  { type: "Tab", mb: 3 },
  { type: "Browser", mb: 1 },
])
