export type FileItemChunk = {
  index: number
  content: string
  tokens: number
  embedding?: number[]
  children?: number[]
  layer?: number
  // all uuids pointing to attachable content to the chunk (e.g. lists and tables)
  uuidsInChunk?: string[]
}
