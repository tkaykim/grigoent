import { Suspense } from 'react'
import { SignupForm } from '@/components/auth/SignupForm'

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupForm />
    </Suspense>
  )
} 