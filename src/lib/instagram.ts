/**
 * 인스타그램 URL에서 media ID를 추출하는 함수
 */
export function extractInstagramMediaId(url: string): string | null {
  if (!url) return null

  // 다양한 인스타그램 URL 형식 지원
  const patterns = [
    /instagram\.com\/p\/([^\/\?#]+)/,
    /instagram\.com\/reel\/([^\/\?#]+)/,
    /instagram\.com\/tv\/([^\/\?#]+)/,
    /instagram\.com\/media\/([^\/\?#]+)/
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
 * 인스타그램 media ID로부터 썸네일 URL을 생성하는 함수
 * 참고: 인스타그램은 공식 썸네일 API를 제공하지 않으므로 기본 이미지 사용
 */
export function getInstagramThumbnail(mediaId: string): string {
  if (!mediaId) return ''
  
  // 인스타그램은 직접적인 썸네일 API를 제공하지 않으므로
  // 실제 작동하는 이미지 URL 사용
  return `https://www.instagram.com/static/images/ico/favicon-200.png/ab6e62c9de0e.png`
}

/**
 * 인스타그램 URL로부터 직접 썸네일 URL을 생성하는 함수
 */
export function getThumbnailFromInstagramUrl(url: string): string {
  const mediaId = extractInstagramMediaId(url)
  if (!mediaId) return ''
  
  return getInstagramThumbnail(mediaId)
}

/**
 * 인스타그램 URL이 유효한지 확인하는 함수
 */
export function isValidInstagramUrl(url: string): boolean {
  return extractInstagramMediaId(url) !== null
}

/**
 * 인스타그램 URL을 임베드 URL로 변환하는 함수
 */
export function getInstagramEmbedUrl(url: string): string | null {
  const mediaId = extractInstagramMediaId(url)
  if (!mediaId) return null
  
  return `https://www.instagram.com/p/${mediaId}/embed/?hidecaption=true&scrolled=true`
}