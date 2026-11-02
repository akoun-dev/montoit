import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'

afterEach(() => {
  document.body.innerHTML = ''
})
