export interface WordNode {
  id: string; word: string; language: string; meaning: string
  family: string; era?: string; x?: number; y?: number
}
export interface WordLink {
  source: string; target: string
  type: 'cognate' | 'derived' | 'borrowed' | 'reconstructed'
  description?: string
}
export interface CognateSet {
  root: string; meaning: string
  languages: Record<string, string>
  period: string; family: string
}
export interface Topic {
  id: string; name: string
  keywords: string[]; meanings: string[]
  icon: string
}
export interface LanguageFamily {
  id: string; name: string; color: string; languages: string[]; era: string
}
