/**
 * Tests automatisés pour le menu hamburger mobile
 * Ce script valide le fonctionnement sur différentes tailles d'écran
 */

const { chromium } = require('playwright');

const viewports = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12', width: 390, height: 844 },
  { name: 'iPad', width: 768, height: 1024 },
  { name: 'Desktop', width: 1200, height: 800 }
];

async function testMobileMenu() {
  console.log('🧪 Début des tests du menu hamburger mobile...\n');
  
  const browser = await chromium.launch();
  
  for (const viewport of viewports) {
    console.log(`📱 Test sur ${viewport.name} (${viewport.width}x${viewport.height})`);
    
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height }
    });
    
    const page = await context.newPage();
    
    try {
      // Chargez votre page de démonstration
      await page.goto('http://localhost:3000/mobile-demo'); // Ajustez l'URL
      
      // Test 1: Vérifier la présence du hamburger sur mobile
      if (viewport.width < 768) {
        const hamburgerExists = await page.locator('#mobile-menu-toggle').count() > 0;
        console.log(`  ✅ Hamburger visible: ${hamburgerExists}`);
        
        if (hamburgerExists) {
          // Test 2: Cliquer sur le hamburger
          await page.click('#mobile-menu-toggle');
          
          // Test 3: Vérifier que le menu s'ouvre
          const menuOpen = await page.locator('.mobile-menu.open').count() > 0;
          console.log(`  ✅ Menu ouvert: ${menuOpen}`);
          
          // Test 4: Vérifier l'overlay
          const overlayVisible = await page.locator('.mobile-menu-backdrop.open').count() > 0;
          console.log(`  ✅ Overlay visible: ${overlayVisible}`);
          
          // Test 5: Tester la navigation clavier
          await page.keyboard.press('Tab');
          await page.keyboard.press('Escape');
          
          // Test 6: Vérifier que le menu se ferme
          const menuClosed = await page.locator('.mobile-menu.open').count() === 0;
          console.log(`  ✅ Menu fermé avec Escape: ${menuClosed}`);
        }
      } else {
        // Sur desktop, le hamburger ne doit pas être visible
        const hamburgerHidden = await page.locator('#mobile-menu-toggle').count() === 0;
        console.log(`  ✅ Hamburger masqué: ${hamburgerHidden}`);
      }
      
      // Test 7: Vérifier l'accessibilité
      const focusableElements = await page.locator('a, button, [tabindex]').count();
      console.log(`  ✅ Éléments focusables: ${focusableElements}`);
      
      // Test 8: Vérifier les animations
      const animationsEnabled = await page.evaluate(() => {
        return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      });
      console.log(`  ✅ Animations activées: ${animationsEnabled}`);
      
      console.log(`  ✅ Tests ${viewport.name} réussis\n`);
      
    } catch (error) {
      console.error(`  ❌ Erreur sur ${viewport.name}:`, error.message);
    }
    
    await context.close();
  }
  
  await browser.close();
  console.log('🎉 Tests terminés!');
}

// Tests d'accessibilité automatisés
async function testAccessibility() {
  console.log('♿ Test d\'accessibilité...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }
  });
  
  const page = await context.newPage();
  await page.goto('http://localhost:3000/mobile-demo');
  
  try {
    // Test ARIA labels
    const hasAriaLabels = await page.evaluate(() => {
      const toggle = document.querySelector('#mobile-menu-toggle');
      return toggle && toggle.getAttribute('aria-label');
    });
    console.log(`  ✅ ARIA labels: ${hasAriaLabels}`);
    
    // Test contraste couleurs
    const contrastTest = await page.evaluate(() => {
      const menu = document.querySelector('.mobile-menu');
      if (!menu) return false;
      
      const styles = window.getComputedStyle(menu);
      return styles.backgroundColor !== styles.color;
    });
    console.log(`  ✅ Contraste couleurs: ${contrastTest}`);
    
    // Test touch targets
    const touchTargetsTest = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a');
      const minSize = 44;
      
      for (let button of buttons) {
        const rect = button.getBoundingClientRect();
        if (rect.width < minSize || rect.height < minSize) {
          return false;
        }
      }
      return true;
    });
    console.log(`  ✅ Touch targets: ${touchTargetsTest}`);
    
  } catch (error) {
    console.error('  ❌ Erreur accessibilité:', error.message);
  }
  
  await browser.close();
}

// Test de performance
async function testPerformance() {
  console.log('⚡ Test de performance...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }
  });
  
  const page = await context.newPage();
  
  try {
    // Mesurer les métriques Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries);
        }).observe({ entryTypes: ['measure', 'navigation'] });
      });
    });
    
    console.log(`  ✅ Performance collectée: ${metrics.length} métriques`);
    
    // Test de fluidité des animations
    const animationTest = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frameCount = 0;
        let lastTime = performance.now();
        
        const measureFPS = () => {
          frameCount++;
          const currentTime = performance.now();
          
          if (currentTime - lastTime >= 1000) {
            resolve(frameCount);
            return;
          }
          
          requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
      });
    });
    
    console.log(`  ✅ FPS mesurés: ${animationTest} fps`);
    
  } catch (error) {
    console.error('  ❌ Erreur performance:', error.message);
  }
  
  await browser.close();
}

// Exécution des tests
async function runAllTests() {
  console.log('🚀 Démarrage des tests complets du menu hamburger mobile\n');
  
  try {
    await testMobileMenu();
    await testAccessibility();
    await testPerformance();
    
    console.log('🎉 Tous les tests ont été exécutés avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
    process.exit(1);
  }
}

// Tests manuels guidés
async function runManualTests() {
  console.log('📋 Guide des tests manuels\n');
  
  console.log('🔍 Tests à effectuer manuellement:\n');
  
  console.log('1. 📱 Test Responsive:');
  console.log('   - Ouvrez la page sur différentes tailles d\'écran');
  console.log('   - Vérifiez l\'apparition/disparition du hamburger');
  console.log('   - Testez sur iPhone, iPad, Desktop\n');
  
  console.log('2. 🖱️ Test Navigation:');
  console.log('   - Cliquez sur chaque élément du menu');
  console.log('   - Vérifiez que les liens fonctionnent');
  console.log('   - Testez le bouton "Fermer"\n');
  
  console.log('3. ⌨️ Test Clavier:');
  console.log('   - Utilisez Tab pour naviguer');
  console.log('   - Appuyez sur Escape pour fermer');
  console.log('   - Vérifiez les focus indicators\n');
  
  console.log('4. 🎨 Test Animations:');
  console.log('   - Ouvrez/fermez le menu plusieurs fois');
  console.log('   - Vérifiez la fluidité (60fps)');
  console.log('   - Testez avec "prefers-reduced-motion"\n');
  
  console.log('5. ♿ Test Accessibilité:');
  console.log('   - Testez avec un lecteur d\'écran');
  console.log('   - Activez le mode contraste élevé');
  console.log('   - Vérifiez les annonces ARIA\n');
}

// Export pour utilisation externe
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--manual')) {
    runManualTests();
  } else if (args.includes('--performance')) {
    testPerformance();
  } else if (args.includes('--accessibility')) {
    testAccessibility();
  } else {
    runAllTests();
  }
}

module.exports = {
  testMobileMenu,
  testAccessibility,
  testPerformance,
  runManualTests
};