import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { COGNATE_SETS, LANGUAGE_FAMILIES, TOPICS, FEATURED_ROOTS, setsByTopic, buildGraph } from '../mock/data'
export { LANGUAGE_FAMILIES, COGNATE_SETS, TOPICS }

function fuzzyMatch(text: string, q: string): { exact: boolean; score: number } {
  const t = text.toLowerCase()
  if (t.includes(q)) return { exact: true, score: 1 }
  if (q.length < 2) return { exact: false, score: 0 }
  // 最长公共子序列比例：兼顾字符命中与相对顺序（如 wter → water）
  const dp = Array.from({ length: q.length + 1 }, () => new Array<number>(t.length + 1).fill(0))
  for (let i = q.length - 1; i >= 0; i--) {
    for (let j = t.length - 1; j >= 0; j--) {
      dp[i][j] = q[i] === t[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  return { exact: false, score: dp[0][0] / q.length }
}

export const useEtymologyStore = defineStore('etymology', () => {
  const graph = ref(buildGraph())
  const selectedNode = ref<any>(null)
  const searchQuery = ref('')
  const selectedFamily = ref('all')
  const selectedTopic = ref<string | null>(null)

  const filteredCognates = computed(() =>
    COGNATE_SETS.filter(cs => {
      const q = searchQuery.value.toLowerCase()
      const matchSearch = !q || cs.root.toLowerCase().includes(q) || cs.meaning.includes(q) || Object.values(cs.languages).some((w: string) => w.toLowerCase().includes(q))
      const matchFamily = selectedFamily.value === 'all' || cs.family === selectedFamily.value
      const topic = TOPICS.find(t => t.id === selectedTopic.value)
      const matchTopic = !topic || setsByTopic(topic).some(s => s.root === cs.root)
      return matchSearch && matchFamily && matchTopic
    })
  )

  const noResults = computed(() => filteredCognates.value.length === 0)

  // 无结果时：按字符重叠度推荐最相近的词根
  const suggestedRoots = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return []
    return COGNATE_SETS
      .map(cs => {
        const words = Object.values(cs.languages).join(' ')
        const m = [fuzzyMatch(cs.root, q), fuzzyMatch(cs.meaning, q), fuzzyMatch(words, q)]
        return { cs, exact: m.some(r => r.exact), score: Math.max(...m.map(r => r.score)) }
      })
      .filter(r => !r.exact && r.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(r => r.cs)
  })

  // 无结果时：结合查询相关性与当前主题推荐相近主题入口
  const relatedTopics = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    return TOPICS
      .filter(t => t.id !== selectedTopic.value)
      .map(t => {
        const members = setsByTopic(t)
        let score = 0
        if (q) {
          score = Math.max(
            ...t.keywords.map(k => fuzzyMatch(k, q).score),
            ...members.flatMap(cs => [fuzzyMatch(cs.meaning, q).score, ...Object.values(cs.languages).map(w => fuzzyMatch(w, q).score)])
          )
        }
        return { topic: t, count: members.length, score }
      })
      .filter(t => t.count > 0 && (!q || t.score >= 0.5))
      .sort((a, b) => b.score - a.score || b.count - a.count)
      .slice(0, 4)
  })

  const featuredCognates = computed(() =>
    FEATURED_ROOTS.map(r => COGNATE_SETS.find(cs => cs.root === r)).filter(Boolean) as typeof COGNATE_SETS
  )

  function applyRootSuggestion(root: string) {
    selectedFamily.value = 'all'
    selectedTopic.value = null
    searchQuery.value = root
  }

  function applyTopic(id: string) {
    selectedFamily.value = 'all'
    searchQuery.value = ''
    selectedTopic.value = id
  }

  function clearTopic() {
    selectedTopic.value = null
  }

  return {
    graph, selectedNode, searchQuery, selectedFamily, selectedTopic,
    filteredCognates, noResults, suggestedRoots, relatedTopics, featuredCognates,
    applyRootSuggestion, applyTopic, clearTopic,
  }
})
