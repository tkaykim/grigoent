/**
 * YouTube URL에서 video ID를 추출하는 함수
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null

  // 다양한 YouTube URL 형식 지원
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    /youtu\.be\/([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * YouTube video ID로부터 썸네일 URL을 생성하는 함수
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'maxres'): string {
  if (!videoId) return ''

  const qualities = {
    default: 'default.jpg',
    medium: 'mqdefault.jpg', 
    high: 'hqdefault.jpg',
    maxres: 'maxresdefault.jpg'
  }

  return `https://img.youtube.com/vi/${videoId}/${qualities[quality]}`
}

/**
 * YouTube URL로부터 직접 썸네일 URL을 생성하는 함수
 */
export function getThumbnailFromUrl(url: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'maxres'): string {
  const videoId = extractYouTubeVideoId(url)
  if (!videoId) return ''
  
  return getYouTubeThumbnail(videoId, quality)
}

/**
 * 썸네일 URL이 유효한지 확인하는 함수
 */
export async function validateThumbnailUrl(url: string): Promise<boolean> {
  if (!url) return false
  
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch (error) {
    console.error('썸네일 URL 검증 오류:', error)
    return false
  }
}

/**
 * 최적의 썸네일 URL을 찾는 함수 (maxres → high → medium → default 순서)
 */
export async function getBestThumbnailUrl(videoId: string): Promise<string> {
  const qualities: Array<'maxres' | 'high' | 'medium' | 'default'> = ['maxres', 'high', 'medium', 'default']
  
  for (const quality of qualities) {
    const thumbnailUrl = getYouTubeThumbnail(videoId, quality)
    const isValid = await validateThumbnailUrl(thumbnailUrl)
    if (isValid) {
      return thumbnailUrl
    }
  }
  
  // 모든 품질이 실패하면 기본값 반환
  return getYouTubeThumbnail(videoId, 'default')
}

/**
 * YouTube URL이 유효한지 확인하는 함수
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null
} 