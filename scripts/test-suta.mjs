/**
 * Script de test pour l'API SUTA
 * Teste directement la route API sans passer par le navigateur.
 *
 * Usage:
 *   node scripts/test-suta.mjs
 *
 * Prérequis : litert-lm serve --port 9379 (dans un autre terminal)
 */

const BASE_URL = 'http://localhost:5000'

async function test() {
  console.log('=== Test API SUTA ===\n')

  // 1. Test GET status
  console.log('1. Test GET /api/suta (status)')
  try {
    const res = await fetch(`${BASE_URL}/api/suta`)
    const data = await res.json()
    console.log('   Status:', res.status)
    console.log('   Réponse:', JSON.stringify(data, null, 2))
    if (res.ok) {
      console.log('   ✅ GET OK')
    } else {
      console.log('   ❌ GET FAILED')
    }
  } catch (err) {
    console.log('   ❌ Network error:', err.message)
  }
  console.log('')

  // 2. Test POST sans auth
  console.log('2. Test POST /api/suta (sans auth)')
  try {
    const res = await fetch(`${BASE_URL}/api/suta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Bonjour, que fais-tu ?',
        sessionId: `test-${Date.now()}`,
      }),
    })
    const data = await res.json()
    console.log('   Status:', res.status)
    if (res.ok) {
      console.log('   ✅ POST OK')
      console.log('   Réponse:', data.response?.slice(0, 100) + '...')
    } else {
      console.log('   ❌ POST FAILED')
      console.log('   Erreur:', JSON.stringify(data, null, 2))
      if (data.mode === 'litert') {
        console.log('   ℹ️  Mode LiteRT (local)')
      } else if (data.mode === 'cloud') {
        console.log('   ℹ️  Mode Azure OpenAI (cloud)')
      }
    }
  } catch (err) {
    console.log('   ❌ Network error:', err.message)
  }
  console.log('')

  // 3. Test POST avec sessionId vide
  console.log('3. Test POST /api/suta (sessionId vide)')
  try {
    const res = await fetch(`${BASE_URL}/api/suta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'test', sessionId: '' }),
    })
    const data = await res.json()
    console.log('   Status:', res.status)
    console.log('   Réponse:', JSON.stringify(data))
    if (res.status === 400 && data.error === 'Session ID requis') {
      console.log('   ✅ Validation OK')
    } else {
      console.log('   ❌ Comportement inattendu')
    }
  } catch (err) {
    console.log('   ❌ Network error:', err.message)
  }
  console.log('')

  // 4. Test GET avec mode d'inférence
  console.log('4. Détection du mode d\'inférence')
  try {
    const res4 = await fetch(`${BASE_URL}/api/suta`)
    const data4 = await res4.json()
    console.log('   Mode:', data4.inference?.mode || 'inconnu')
    if (data4.inference?.mode === 'litert') {
      console.log('   ✅ LiteRT disponible')
    } else {
      console.log('   ℹ️  Fallback cloud')
    }
  } catch (err) {
    console.log('   ❌ Erreur:', err.message)
  }
  console.log('')

  // 5. Test streaming SSE
  console.log('5. Test POST streaming (?stream=true)')
  try {
    const res = await fetch(`${BASE_URL}/api/suta?stream=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Dis bonjour en 3 mots',
        sessionId: `test-stream-${Date.now()}`,
      }),
    })
    if (res.ok) {
      if (!res.body) { throw new Error('Pas de body') }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      const tokens = []
      let buffer = ''
      let done = false
      while (!done) {
        const { done: d, value } = await reader.read()
        done = d
        if (value) buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const t = line.trim()
          if (!t.startsWith('data: ')) continue
          const data = t.slice(6)
          if (data === '[DONE]') continue
          try {
            const p = JSON.parse(data)
            if (p.mode) continue
            const token = p.choices?.[0]?.delta?.content
            if (token) tokens.push(token)
          } catch {}
        }
      }
      const full = tokens.join('')
      console.log('   Status:', res.status)
      console.log('   Tokens reçus:', tokens.length)
      console.log('   Réponse complète:', full.slice(0, 200))
      if (tokens.length > 1) {
        console.log('   ✅ Streaming OK (multiples tokens)')
      } else {
        console.log('   ⚠️  Peu de tokens, vérifier le streaming')
      }
    } else {
      console.log('   ❌ STREAM FAILED:', res.status)
    }
  } catch (err) {
    console.log('   ❌ Network error:', err.message)
  }
  console.log('')

  // 6. Test message long
  console.log('6. Test POST avec message long')
  try {
    const longMsg = 'Que dois-je faire pour louer un appartement à Abidjan ? ' + 
      'Explique-moi toutes les étapes du début à la fin.'
    const res = await fetch(`${BASE_URL}/api/suta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: longMsg,
        sessionId: `test-long-${Date.now()}`,
      }),
    })
    const data = await res.json()
    console.log('   Status:', res.status)
    if (res.ok) {
      console.log('   ✅ POST message long OK')
      console.log('   Mode:', data.mode)
      console.log('   Taille réponse:', data.response?.length, 'caractères')
    } else {
      console.log('   ❌ POST FAILED')
      console.log('   Erreur:', JSON.stringify(data))
    }
  } catch (err) {
    console.log('   ❌ Network error:', err.message)
  }
}

test().catch(console.error)
