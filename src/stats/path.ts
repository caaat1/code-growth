/** Where a project's stats live, as absolute paths. */
export interface StatsPath {
  readonly config: string
  /** The snapshots, the one source everything else is rendered from. */
  readonly data: string
  readonly dir: string
  readonly graphData: string
  readonly latestMd: string
}
