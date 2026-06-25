const HIDDEN_PUBLIC_ARTIST_IDS = new Set([
  '217b56a4-08b4-42fd-9892-a8a2cb7e3515',
  '50ed5d36-ada1-4269-8e49-e08817d631ea',
])

const HIDDEN_PUBLIC_TEAM_IDS = new Set([
  'cd2e10fc-da86-4a18-b1e9-f5f496821a8e',
])

const HIDDEN_PUBLIC_ARTIST_SLUGS = new Set(['terry', 'jisoo'])
const HIDDEN_PUBLIC_TEAM_SLUGS = new Set(['capt'])

type PublicRecord = {
  id?: string | null
  slug?: string | null
  is_hidden?: boolean | null
}

function normalizeSlug(slug?: string | null) {
  return String(slug || '').trim().toLowerCase()
}

export function isHiddenPublicArtist(artist?: PublicRecord | null) {
  if (!artist) return false
  return (
    artist.is_hidden === true ||
    (artist.id ? HIDDEN_PUBLIC_ARTIST_IDS.has(artist.id) : false) ||
    HIDDEN_PUBLIC_ARTIST_SLUGS.has(normalizeSlug(artist.slug))
  )
}

export function isHiddenPublicTeam(team?: PublicRecord | null) {
  if (!team) return false
  return (
    team.is_hidden === true ||
    (team.id ? HIDDEN_PUBLIC_TEAM_IDS.has(team.id) : false) ||
    HIDDEN_PUBLIC_TEAM_SLUGS.has(normalizeSlug(team.slug))
  )
}

export function filterVisiblePublicArtists<T extends PublicRecord>(artists: T[]) {
  return artists.filter((artist) => !isHiddenPublicArtist(artist))
}

export function filterVisiblePublicTeams<T extends PublicRecord>(teams: T[]) {
  return teams.filter((team) => !isHiddenPublicTeam(team))
}
