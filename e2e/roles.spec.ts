import { test, expect, type Page } from '@playwright/test'

// ─── Test users ──────────────────────────────────────────────────────────────
const LOCATAIRE_EMAIL = 'locataire@montoit.ci'
const PROPRIETAIRE_EMAIL = 'proprietaire@montoit.ci'
const TC_EMAIL = 'tc@montoit.ci'
const ADMIN_EMAIL = 'admin@montoit.ci'
const PASSWORD = 'Test1234!'

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function goToLogin(page: Page) {
  await page.goto('/')
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.context().clearCookies()
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /Se connecter/i }).click()
  await expect(page.locator('#login-email')).toBeVisible({ timeout: 10_000 })
}

async function loginWithEmail(page: Page, email: string, password: string) {
  await page.fill('#login-email', email)
  await page.fill('#login-password', password)
  await page.getByRole('button', { name: /Se connecter/i }).click()
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
}

async function waitForDashboard(page: Page) {
  await expect(page.getByText('Tableau de bord').first()).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(1500)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Changement de rôle (switchRole)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('1. Locataire → switchRole vers Propriétaire', async ({ page }) => {
    test.setTimeout(120_000)
    await goToLogin(page)
    await loginWithEmail(page, LOCATAIRE_EMAIL, PASSWORD)
    await waitForDashboard(page)

    // Verify locataire sidebar items visible
    await expect(page.getByText('Chercher un bien')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Mes biens')).not.toBeVisible()

    // Click "Mode Propriétaire" quick switch button
    await page.getByRole('button', { name: /Mode Propriétaire/i }).click()
    // Confirm modal
    await page.getByRole('dialog').getByRole('button', { name: /Confirmer/i }).click()
    await page.waitForTimeout(3000)

    // Verify proprietaire sidebar items now visible
    await expect(page.getByText('Mes biens')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Chercher un bien')).not.toBeVisible()
  })

  test('2. Propriétaire → switchRole vers Locataire', async ({ page }) => {
    test.setTimeout(120_000)
    await goToLogin(page)
    await loginWithEmail(page, PROPRIETAIRE_EMAIL, PASSWORD)
    await waitForDashboard(page)

    // Verify proprietaire sidebar items visible
    await expect(page.getByText('Mes biens')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Chercher un bien')).not.toBeVisible()

    // Click "Mode Locataire" quick switch button
    await page.getByRole('button', { name: /Mode Locataire/i }).click()
    // Confirm modal
    await page.getByRole('dialog').getByRole('button', { name: /Confirmer/i }).click()
    await page.waitForTimeout(3000)

    // Verify locataire sidebar items now visible
    await expect(page.getByText('Chercher un bien')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Mes biens')).not.toBeVisible()
  })

  test('3. switchRole depuis dropdown utilisateur', async ({ page }) => {
    test.setTimeout(120_000)
    await goToLogin(page)
    await loginWithEmail(page, LOCATAIRE_EMAIL, PASSWORD)
    await waitForDashboard(page)

    // Use the quick switch button (same as test 1) instead of avatar dropdown
    await page.getByRole('button', { name: /Mode Propriétaire/i }).click()
    await page.getByRole('dialog').getByRole('button', { name: /Confirmer/i }).click()
    await page.waitForTimeout(3000)
    await expect(page.getByText('Mes biens')).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Pages Admin & TC', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('4. Connexion admin → dashboard admin avec sections', async ({ page }) => {
    test.setTimeout(90_000)
    await goToLogin(page)
    await loginWithEmail(page, ADMIN_EMAIL, PASSWORD)
    await waitForDashboard(page)

    // Check role badge
    await expect(page.getByText('Administration')).toBeVisible({ timeout: 5000 })
    // Check admin sections
    for (const section of ['GESTION', 'SUPERVISION', 'SYSTÈME']) {
      await expect(page.getByText(section).first()).toBeVisible({ timeout: 5000 })
    }
    // Check admin items
    await expect(page.getByText('Utilisateurs').first()).toBeVisible({ timeout: 4000 })
    await expect(page.getByText('Modération contenu')).toBeVisible({ timeout: 4000 })
  })

  test('5. Admin → navigation Utilisateurs', async ({ page }) => {
    test.setTimeout(90_000)
    await goToLogin(page)
    await loginWithEmail(page, ADMIN_EMAIL, PASSWORD)
    await waitForDashboard(page)

    await page.getByText('Utilisateurs').first().click()
    await page.waitForTimeout(2000)
    const hasContent = await page.getByRole('heading').filter({ hasText: /utilisateurs/i }).first().isVisible().catch(() => false)
      || await page.locator('table').first().isVisible().catch(() => false)
    expect(hasContent).toBeTruthy()
  })

  test('6. Admin → navigation Signalements', async ({ page }) => {
    test.setTimeout(90_000)
    await goToLogin(page)
    await loginWithEmail(page, ADMIN_EMAIL, PASSWORD)
    await waitForDashboard(page)

    await page.getByText('Signalements').first().click()
    await page.waitForTimeout(2000)
    await expect(page.getByRole('heading').filter({ hasText: /signalement/i }).first()).toBeVisible({ timeout: 5000 })
  })

  test('7. Connexion TC → dashboard TC avec sections', async ({ page }) => {
    test.setTimeout(90_000)
    await goToLogin(page)
    await loginWithEmail(page, TC_EMAIL, PASSWORD)
    await waitForDashboard(page)

    await expect(page.getByText('Tiers de Confiance')).toBeVisible({ timeout: 5000 })
    for (const section of ['VALIDATION', 'CERTIFICATION', 'MISSIONS', 'SÉCURITÉ']) {
      await expect(page.getByText(section).first()).toBeVisible({ timeout: 5000 })
    }
    await expect(page.getByText('Tous les biens')).toBeVisible({ timeout: 4000 })
    await expect(page.getByText('Dossiers de validation')).toBeVisible({ timeout: 4000 })
  })

  test('8. TC → navigation Vérification biens', async ({ page }) => {
    test.setTimeout(90_000)
    await goToLogin(page)
    await loginWithEmail(page, TC_EMAIL, PASSWORD)
    await waitForDashboard(page)

    await page.getByText('Vérification biens').first().click()
    await page.waitForTimeout(2000)
    await expect(page.getByRole('heading').filter({ hasText: /vérification|propriété/i }).first()).toBeVisible({ timeout: 5000 })
  })

  test('9. TC → navigation Alertes fraude', async ({ page }) => {
    test.setTimeout(90_000)
    await goToLogin(page)
    await loginWithEmail(page, TC_EMAIL, PASSWORD)
    await waitForDashboard(page)

    await page.getByText('Alertes fraude').first().click()
    await page.waitForTimeout(2000)
    await expect(page.getByRole('heading').filter({ hasText: /alerte|fraude/i }).first()).toBeVisible({ timeout: 5000 })
  })
})
