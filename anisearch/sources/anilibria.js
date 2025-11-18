import AbstractSource from './abstract.js'

export default new class AniLibria extends AbstractSource {
  apiUrl = atob('aHR0cHM6Ly9hcGkuYW5pbGlicmlhLnR2L3YxL2dldFRpdGxl')
  torrentUrl = atob('aHR0cHM6Ly9hcGkuYW5pbGlicmlhLnR2L3YxL2dldFRvcnJlbnQ=')

  /**
   * Поиск по anilistId через поиск по названию
   * @param {number} anilistId
   * @param {string[]} titles
   * @returns {Promise<string|null>}
   */
  async #getAniLibriaCode(anilistId, titles) {
    if (!titles?.length) return null
    
    try {
      // Пробуем найти по названию (используем первое название)
      const searchTitle = titles[0]
      const res = await fetch(`${this.apiUrl}?search=${encodeURIComponent(searchTitle)}`)
      if (!res.ok) return null
      
      const data = await res.json()
      
      // Ищем точное совпадение или первое подходящее
      if (data && data.code) {
        return data.code
      }
      
      // Если это массив, ищем первый элемент
      if (Array.isArray(data) && data.length > 0) {
        return data[0].code || null
      }
      
      return null
    } catch {
      return null
    }
  }

  /**
   * @param {Object} params
   * @param {string} params.code
   * @param {number} [params.episode]
   * @param {string[]} [params.titles]
   * @returns {Promise<import('./').TorrentResult[]>}
   */
  async #query({ code, episode, titles }) {
    if (!code) return []

    const queryParams = new URLSearchParams({ code })
    if (episode) {
      queryParams.append('episode', episode.toString())
    }

    try {
      const res = await fetch(`${this.torrentUrl}?${queryParams}`)
      if (!res.ok) return []

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
    } catch {
      return []
    }
  }

  /**
   * @type {import('./').SearchFunction}
   */
  async single({ anilistId, titles, episode }) {
    if (!anilistId) throw new Error('No anilistId provided')
    if (!titles?.length) throw new Error('No titles provided')

    const code = await this.#getAniLibriaCode(anilistId, titles)
    if (!code) return []

    return this.#query({ code, episode, titles })
  }

  /**
   * @type {import('./').SearchFunction}
   */
  async batch({ anilistId, titles }) {
    if (!anilistId) throw new Error('No anilistId provided')
    if (!titles?.length) throw new Error('No titles provided')

    const code = await this.#getAniLibriaCode(anilistId, titles)
    if (!code) return []

    return this.#query({ code, titles })
  }

  /**
   * @type {import('./').SearchFunction}
   */
  async movie({ anilistId, titles }) {
    if (!anilistId) throw new Error('No anilistId provided')
    if (!titles?.length) throw new Error('No titles provided')

    const code = await this.#getAniLibriaCode(anilistId, titles)
    if (!code) return []

    return this.#query({ code, titles })
  }

  /**
   * Checks if the source URL is reachable.
   * @returns {Promise<boolean>} True if fetch succeeds.
   */
  async validate() {
    try {
      const res = await fetch(this.apiUrl + '?search=test')
      return res?.ok || false
    } catch {
      return false
    }
  }
}()

