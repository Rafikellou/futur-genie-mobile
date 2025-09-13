const sharp = require('sharp');
const path = require('path');

async function createAssets() {
  const assetsDir = path.join(__dirname, 'assets');
  
  // Créer une image 1024x1024 pour l'icône avec un dégradé bleu
  const iconBuffer = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 59, g: 130, b: 246, alpha: 1 }
    }
  })
  .png()
  .toBuffer();

  // Créer une image 1024x1024 pour l'adaptive icon
  const adaptiveIconBuffer = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 59, g: 130, b: 246, alpha: 1 }
    }
  })
  .png()
  .toBuffer();

  // Créer une image 1284x2778 pour le splash screen
  const splashBuffer = await sharp({
    create: {
      width: 1284,
      height: 2778,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .png()
  .toBuffer();

  // Créer une petite favicon 32x32
  const faviconBuffer = await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 4,
      background: { r: 59, g: 130, b: 246, alpha: 1 }
    }
  })
  .png()
  .toBuffer();

  // Sauvegarder les fichiers
  const fs = require('fs').promises;
  
  await fs.writeFile(path.join(assetsDir, 'icon.png'), iconBuffer);
  await fs.writeFile(path.join(assetsDir, 'adaptive-icon.png'), adaptiveIconBuffer);
  await fs.writeFile(path.join(assetsDir, 'splash.png'), splashBuffer);
  await fs.writeFile(path.join(assetsDir, 'favicon.png'), faviconBuffer);

  console.log('Assets PNG valides créés avec succès!');
}

createAssets().catch(console.error);
