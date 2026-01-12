export interface WikiPage {
  id: string
  title: string
  content: string
  type?: string
  tags?: string[]
  created: Date
  modified: Date
}

export interface WikiOptions {
  storage?: WikiStorage
  linkPattern?: RegExp
}

export interface WikiStorage {
  save(page: WikiPage): Promise<void>
  load(id: string): Promise<WikiPage | null>
  delete(id: string): Promise<void>
  list(): Promise<WikiPage[]>
}

export interface CreatePageData {
  id?: string
  title: string
  content?: string
  type?: string
  tags?: string[]
}

export interface UpdatePageData {
  title?: string
  content?: string
  type?: string | undefined
  tags?: string[] | undefined
}

export interface RenamePageOptions {
  updateId?: boolean
}

export interface DeletePageOptions {
  updateLinks?: boolean
}

export interface GetPageByTitleOptions {
  ignoreCase?: boolean
}

export interface ListPagesOptions {
  type?: string
  tags?: string[]
  sort?: 'title' | 'created' | 'modified'
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface SearchOptions {
  fields?: ('title' | 'content' | 'tags')[]
  type?: string
  limit?: number
}

export interface ImportOptions {
  mode?: 'replace' | 'merge' | 'skip'
  emitEvents?: boolean
}

export interface DeadLink {
  source: string
  target: string
}

export type WikiEvent =
  | { type: 'create'; page: WikiPage }
  | { type: 'update'; page: WikiPage; previous: WikiPage }
  | { type: 'delete'; page: WikiPage }
  | { type: 'rename'; page: WikiPage; previousTitle: string }

export type WikiEventCallback = (event: WikiEvent) => void

export type UnsubscribeFunction = () => void

export type Graph = Record<string, string[]>

export interface Wiki {
  createPage(data: CreatePageData): Promise<WikiPage>
  getPage(id: string): WikiPage | undefined
  getPageByTitle(title: string, options?: GetPageByTitleOptions): WikiPage | undefined
  updatePage(id: string, data: UpdatePageData): Promise<WikiPage>
  deletePage(id: string, options?: DeletePageOptions): Promise<void>
  renamePage(id: string, newTitle: string, options?: RenamePageOptions): Promise<WikiPage>
  getLinks(id: string): string[]
  getBacklinks(id: string): string[]
  getLinkedPages(id: string): WikiPage[]
  getBacklinkPages(id: string): WikiPage[]
  resolveLink(linkText: string): string
  resolveLinkToPage(linkText: string): WikiPage | undefined
  getDeadLinks(): DeadLink[]
  getDeadLinksForPage(id: string): string[]
  getOrphans(): WikiPage[]
  getGraph(): Graph
  getConnectedPages(id: string, depth?: number): WikiPage[]
  listPages(options?: ListPagesOptions): WikiPage[]
  search(query: string, options?: SearchOptions): WikiPage[]
  getTags(): string[]
  getPagesByTag(tag: string): WikiPage[]
  getTypes(): string[]
  getPagesByType(type: string): WikiPage[]
  export(): WikiPage[]
  import(pages: WikiPage[], options?: ImportOptions): Promise<number>
  toJSON(): string
  on(event: string, callback: WikiEventCallback): UnsubscribeFunction
  onChange(callback: WikiEventCallback): UnsubscribeFunction
}
