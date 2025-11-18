import AbstractSource from './abstract.js'

export default new class AniLibria extends AbstractSource {
  url = atob('aHR0cHM6Ly9hcGkuYW5pbGlicmlhLnR2L3YxL2dldFRvcnJlbnQ=')
  apiUrl = atob('aHR0cHM6Ly9hcGkuYW5pbGlicmlhLnR2L3YxL2dldFRpdGxl')

  /**
   * @param {number} anilistId
   * @returns {Promise<number|null>}
   */
  async #getAniLibriaId(anilistId) {
    try {
      const res = await fetch(`${this.apiUrl}?id=${anilistId}`)
      const data = await res.json()
      return data?.id || null
    } catch {
      return null
    }
  }

  /**
   * @param {Object} params
   * @param {number} params.anilibriaId
   * @param {number} [params.episode]
   * @param {string[]} [params.titles]
   * @returns {Promise<import('./').TorrentResult[]>}
   */
  async #query({ anilibriaId, episode, titles }) {
    if (!anilibriaId) return []

    const queryParams = new URLSearchParams({ id: anilibriaId.toString() })
    if (episode) {
      queryParams.append('episode', episode.toString())
    }

    const res = await fetch(`${this.url}?${queryParams}`)
    if (!res.ok) return []

    /** @type {import('./types').AniLibria} */
    const data = await res.json()

    if (!data || !data.torrents || !Array.isArray(data.torrents)) return []

    return data.torrents.map(({ hash, quality, series, size, uploaded_timestamp }) => ({
      hash: hash,
      link: `magnet:?xt=urn:btih:${hash}`,
      title: `${titles?.[0] || 'Anime'} ${series ? `- Серия ${series}` : ''} [${quality?.string || 'Unknown'}]`,
      size: size || 0,
      type: series ? undefined : 'batch',
      date: uploaded_timestamp ? new Date(uploaded_timestamp * 1000) : new Date(),
      seeders: 0,
      leechers: 0,
      downloads: 0,
      accuracy: 'high'
    }))
  }

  /**
   * @type {import('./').SearchFunction}
   */
  async single({ anilistId, titles, episode }) {
    if (!anilistId) throw new Error('No anilistId provided')
    if (!titles?.length) throw new Error('No titles provided')

    const anilibriaId = await this.#getAniLibriaId(anilistId)
    if (!anilibriaId) return []

    return this.#query({ anilibriaId, episode, titles })
  }

  /**
   * @type {import('./').SearchFunction}
   */
  async batch({ anilistId, titles }) {
    if (!anilistId) throw new Error('No anilistId provided')
    if (!titles?.length) throw new Error('No titles provided')

    const anilibriaId = await this.#getAniLibriaId(anilistId)
    if (!anilibriaId) return []

    return this.#query({ anilibriaId, titles })
  }

  /**
   * @type {import('./').SearchFunction}
   */
  async movie({ anilistId, titles }) {
    if (!anilistId) throw new Error('No anilistId provided')
    if (!titles?.length) throw new Error('No titles provided')

    const anilibriaId = await this.#getAniLibriaId(anilistId)
    if (!anilibriaId) return []

    return this.#query({ anilibriaId, titles })
  }

  /**
   * Checks if the source URL is reachable.
   * @returns {Promise<boolean>} True if fetch succeeds.
   */
  async validate() {
    try {
      const res = await fetch(this.apiUrl + '?id=1')
      return res?.ok || false
    } catch {
      return false
    }
  }
}()

