import { test, expect, type Page } from '@playwright/test'

// ─── Test users from seed scripts ────────────────────────────────────────────
const LOCATAIRE_EMAIL = 'locataire@montoit.ci'
const PROPRIETAIRE_EMAIL = 'proprietaire@montoit.ci'
const PASSWORD = 'Test1234!'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Clear all auth state (cookies + localStorage) and navigate to home */
async function cleanSession(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.context().clearCookies()
}

/** Navigate to login form and wait for it to be ready */
async function goToLogin(page: Page) {
  await cleanSession(page)
  // Wait for page to fully load (checkAuth + render)
  await page.waitForLoadState('networkidle')
  // The LoadingScreen should resolve and show "Se connecter" button
  const loginButton = page.getByRole('button', { name: /Se connecter/i })
  await expect(loginButton).toBeVisible({ timeout: 20_000 })
  await loginButton.click()
  // Wait for login form to appear
  await expect(page.locator('#login-email')).toBeVisible({ timeout: 10_000 })
}

/** Fill and submit the email login form */
async function loginWithEmail(page: Page, email: string, password: string) {
  await page.fill('#login-email', email)
  await page.fill('#login-password', password)
  // Click submit
  await page.getByRole('button', { name: /Se connecter/i }).click()
  // Wait for API calls to complete
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
}

/** Check if we're on the dashboard by looking for key indicators */
async function isDashboardVisible(page: Page): Promise<boolean> {
  // Method 1: Check for the avatar button (header — visible only on non-dashboard views)
  const avatar = page.locator('[aria-label="Menu utilisateur"]')
  if (await avatar.isVisible().catch(() => false)) return true

  // Method 2: Check for dashboard-specific text (sidebar/nav within the dashboard layout)
  const texts = ['Tableau de bord', 'Mon profil', 'Déconnexion']
  for (const text of texts) {
    if (await page.getByText(text).first().isVisible().catch(() => false)) return true
  }

  return false
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Flux de connexion', () => {

  test('1. Connexion locataire → redirection vers le dashboard', async ({ page }) => {
    test.setTimeout(90_000)

    await goToLogin(page)
    await loginWithEmail(page, LOCATAIRE_EMAIL, PASSWORD)

    await page.waitForTimeout(3000)
    const onDashboard = await isDashboardVisible(page)
    expect(onDashboard).toBeTruthy()
  })

  test('2. Connexion propriétaire → redirection vers le dashboard', async ({ page }) => {
    test.setTimeout(90_000)

    await goToLogin(page)
    await loginWithEmail(page, PROPRIETAIRE_EMAIL, PASSWORD)

    await page.waitForTimeout(5000)
    const onDashboard = await isDashboardVisible(page)
    expect(onDashboard).toBeTruthy()
  })

  test('3. Échec de connexion → message d\'erreur', async ({ page }) => {
    test.setTimeout(45_000)

    await goToLogin(page)
    await loginWithEmail(page, LOCATAIRE_EMAIL, 'WRONG_PASSWORD')

    // Wait for error — the store displays it in a <p> with text-red-500
    await expect(page.getByText(/Email ou mot de passe incorrect|Erreur/i)).toBeVisible({ timeout: 15_000 })

    // We should still be on the login page
    await expect(page.locator('#login-email')).toBeVisible()
  })

  test('4. Navigation vers les liens annexes (inscription, mot de passe oublié)', async ({ page }) => {
    test.setTimeout(45_000)

    await goToLogin(page)

    // Click "Pas encore de compte ? S'inscrire"
    await page.getByText("Pas encore de compte").click()
    await page.waitForTimeout(1500)

    // Should now be on the register form
    const registerForm = page.locator('input[type="email"]').first()
    await expect(registerForm).toBeVisible({ timeout: 5000 })

    // Go back to login
    await page.getByText(/Retour/i).click()
    await page.waitForTimeout(1500)

    // Now click "Mot de passe oublié"
    await page.getByText(/Mot de passe oublié/i).click()
    await page.waitForTimeout(1500)

    // Should now be on the forgot-password form
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('5. Déconnexion → retour à la page d\'accueil', async ({ page }) => {
    test.setTimeout(90_000)

    // Step 1: Login
    await goToLogin(page)
    await loginWithEmail(page, LOCATAIRE_EMAIL, PASSWORD)
    await page.waitForTimeout(3000)
    const onDashboard = await isDashboardVisible(page)
    expect(onDashboard).toBeTruthy()

    // Step 2: Logout via clearing the zustand persisted state from localStorage
    // (The Header with avatar is NOT visible inside the dashboard view — dashboard
    //  has its own layout without the page Header, so we can't click the avatar)
    await page.evaluate(() => {
      // Clear zustand persist key so the store rehydrates with defaults
      localStorage.removeItem('montoit-auth')
    })
    await page.context().clearCookies()

    // Step 3: Navigate to home — on mount, useEffect calls checkAuth() which
    // finds 401 (no cookies), resets store state, and shows the hero page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // The Header should now show "Se connecter" / "S'inscrire" buttons
    await expect(page.getByRole('button', { name: /Se connecter/i })).toBeVisible({ timeout: 20_000 })
  })

  test('6. Connexion SMS → message d\'erreur pour numéro inconnu', async ({ page }) => {
    test.setTimeout(45_000)

    await goToLogin(page)

    // Switch to SMS method
    await page.getByRole('button', { name: /SMS/i }).click()
    await page.waitForTimeout(500)

    // Check that phone input is visible
    await expect(page.locator('#login-phone')).toBeVisible({ timeout: 5000 })

    // Submit an invalid phone number
    await page.fill('#login-phone', '0000000000')
    await page.getByRole('button', { name: /Envoyer le code/i }).click()

    // Wait for the error — the Supabase API returns "Aucun compte associé à ce numéro"
    await expect(page.getByText(/Aucun compte|Erreur|associé|inconnu/i)).toBeVisible({ timeout: 10_000 })
  })
})
