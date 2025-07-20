'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { DollarSign, HelpCircle } from 'lucide-react'

interface BudgetInputProps {
  value: string
  currency: string
  isUndecided: boolean
  onValueChange: (value: string) => void
  onCurrencyChange: (currency: string) => void
  onUndecidedChange: (undecided: boolean) => void
  placeholder?: string
  className?: string
}

const currencies = [
  { value: 'KRW', label: '원 (₩)', symbol: '₩' },
  { value: 'USD', label: '달러 ($)', symbol: '$' },
  { value: 'EUR', label: '유로 (€)', symbol: '€' },
  { value: 'JPY', label: '엔 (¥)', symbol: '¥' },
  { value: 'CNY', label: '위안 (¥)', symbol: '¥' }
]

export function BudgetInput({
  value,
  currency,
  isUndecided,
  onValueChange,
  onCurrencyChange,
  onUndecidedChange,
  placeholder = "예산을 입력하세요",
  className = ""
}: BudgetInputProps) {
  const [isUndecidedHovered, setIsUndecidedHovered] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    // 숫자와 쉼표만 허용
    const numericValue = inputValue.replace(/[^0-9,]/g, '')
    onValueChange(numericValue)
  }

  const handleUndecidedClick = () => {
    onUndecidedChange(!isUndecided)
    if (!isUndecided) {
      // 미정으로 설정할 때 입력값 초기화
      onValueChange('')
    }
  }

  const selectedCurrency = currencies.find(c => c.value === currency) || currencies[0]

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="flex items-center space-x-1">
        <DollarSign className="w-4 h-4" />
        <span>예산</span>
      </Label>
      
      <div className="flex space-x-2">
        {/* 예산 입력 필드 */}
        <div className="flex-1 relative">
          <div className="relative">
            <Input
              type="text"
              value={value}
              onChange={handleInputChange}
              placeholder={placeholder}
              disabled={isUndecided}
              className={`pr-20 ${isUndecided ? 'bg-gray-100 text-gray-500' : ''}`}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Select
                value={currency}
                onValueChange={onCurrencyChange}
                disabled={isUndecided}
              >
                <SelectTrigger className="w-auto h-6 border-0 bg-transparent p-0 hover:bg-transparent">
                  <SelectValue>
                    <span className="text-sm font-medium">
                      {selectedCurrency.symbol}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr.value} value={curr.value}>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{curr.symbol}</span>
                        <span className="text-sm text-gray-500">{curr.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 미정 버튼 */}
        <Button
          type="button"
          variant={isUndecided ? "default" : "outline"}
          size="sm"
          onClick={handleUndecidedClick}
          onMouseEnter={() => setIsUndecidedHovered(true)}
          onMouseLeave={() => setIsUndecidedHovered(false)}
          className="whitespace-nowrap min-w-[60px]"
        >
          {isUndecided ? (
            <div className="flex items-center space-x-1">
              <HelpCircle className="w-3 h-3" />
              <span className="text-xs">미정</span>
            </div>
          ) : (
            <span className="text-xs">미정</span>
          )}
        </Button>
      </div>

      {/* 미정 툴팁 */}
      {isUndecidedHovered && (
        <div className="absolute z-10 mt-1 px-2 py-1 text-xs bg-gray-800 text-white rounded shadow-lg">
          아직 예산이 정해지지 않은 경우 선택하세요
        </div>
      )}

      {/* 입력 가이드 */}
      {!isUndecided && (
        <p className="text-xs text-gray-500">
          예: 1,000,000 (쉼표 없이 입력해도 됩니다)
        </p>
      )}
    </div>
  )
} 