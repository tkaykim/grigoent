'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from './button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog'
import { Slider } from './slider'
import { RotateCcw, ZoomIn, ZoomOut, Download, X } from 'lucide-react'

interface ImageCropperProps {
  isOpen: boolean
  onClose: () => void
  onCrop: (croppedImage: string) => void
  imageFile: File | null
  aspectRatio?: number
  cropShape?: 'circle' | 'square'
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}

export function ImageCropper({
  isOpen,
  onClose,
  onCrop,
  imageFile,
  aspectRatio = 1,
  cropShape = 'circle',
  minWidth = 100,
  minHeight = 100,
  maxWidth = 800,
  maxHeight = 800
}: ImageCropperProps) {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // 이미지 파일이 변경되면 로드
  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string)
        setScale(1)
        setRotation(0)
        setPosition({ x: 0, y: 0 })
      }
      reader.readAsDataURL(imageFile)
    }
  }, [imageFile])

  // 이미지 로드 완료 후 캔버스 초기화
  const handleImageLoad = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 캔버스 크기 설정
    canvas.width = 400
    canvas.height = 400

    drawImage()
  }, [scale, rotation, position])

  // 이미지 그리기
  const drawImage = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 클리핑 패스 설정 (원형 또는 사각형)
    ctx.save()
    if (cropShape === 'circle') {
      ctx.beginPath()
      ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, 2 * Math.PI)
      ctx.clip()
    }

    // 이미지 변환 적용
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(scale, scale)
    ctx.translate(-imageRef.current.width / 2 + position.x, -imageRef.current.height / 2 + position.y)

    ctx.drawImage(imageRef.current, 0, 0)
    ctx.restore()
  }, [scale, rotation, position, cropShape])

  // 드래그 시작
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  // 드래그 중
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  // 드래그 종료
  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 줌 인/아웃
  const handleZoom = (direction: 'in' | 'out') => {
    const zoomFactor = direction === 'in' ? 1.1 : 0.9
    const newScale = Math.max(0.1, Math.min(3, scale * zoomFactor))
    setScale(newScale)
  }

  // 회전
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  // 크롭 완료
  const handleCrop = () => {
    if (!canvasRef.current) return

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const croppedImageUrl = URL.createObjectURL(blob)
        onCrop(croppedImageUrl)
        onClose()
      }
    }, 'image/jpeg', 0.9)
  }

  // 이미지 변환이 변경될 때마다 다시 그리기
  useEffect(() => {
    drawImage()
  }, [drawImage])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>이미지 편집</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 컨트롤 버튼들 */}
          <div className="flex items-center justify-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleZoom('out')}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleZoom('in')}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRotate}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* 줌 슬라이더 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">확대/축소</label>
            <Slider
              value={[scale]}
              onValueChange={(value) => setScale(value[0])}
              min={0.1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* 회전 슬라이더 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">회전</label>
            <Slider
              value={[rotation]}
              onValueChange={(value) => setRotation(value[0])}
              min={0}
              max={360}
              step={1}
              className="w-full"
            />
          </div>

          {/* 이미지 편집 영역 */}
          <div className="relative border rounded-lg overflow-hidden bg-gray-100">
            <div
              className="relative w-full h-96 cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              />
              
              {/* 숨겨진 이미지 (캔버스에서 사용) */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="편집용 이미지"
                className="hidden"
                onLoad={handleImageLoad}
              />
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              <X className="w-4 h-4 mr-2" />
              취소
            </Button>
            
            <Button
              type="button"
              onClick={handleCrop}
            >
              <Download className="w-4 h-4 mr-2" />
              적용
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 