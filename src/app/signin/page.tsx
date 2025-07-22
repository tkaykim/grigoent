import { Suspense } from 'react'
import { SigninForm } from '@/components/auth/SigninForm'

export default function SigninPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SigninForm />
    </Suspense>
  )
} 