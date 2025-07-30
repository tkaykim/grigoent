'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface AuthTimeoutMessageProps {
  onRetry: () => void
}

export function AuthTimeoutMessage({ onRetry }: AuthTimeoutMessageProps) {
  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600">
          <AlertTriangle className="w-5 h-5" />
          연결 문제
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-600">
          인증 서비스에 연결하는 데 시간이 오래 걸리고 있습니다. 다음 방법을 시도해보세요:
        </p>
        
        <div className="space-y-2 text-sm">
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">브라우저 설정 확인</h4>
            <ul className="text-blue-800 space-y-1 text-xs">
              <li>• 쿠키 설정이 활성화되어 있는지 확인</li>
              <li>• 서드파티 쿠키 차단을 해제</li>
              <li>• 시크릿 모드에서 일반 모드로 변경</li>
            </ul>
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">기타 해결 방법</h4>
            <ul className="text-green-800 space-y-1 text-xs">
              <li>• 브라우저 캐시 및 쿠키 삭제</li>
              <li>• 페이지 새로고침</li>
              <li>• 다른 브라우저로 시도</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={onRetry} className="flex-1">
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 시도
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="flex-1"
          >
            페이지 새로고침
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 