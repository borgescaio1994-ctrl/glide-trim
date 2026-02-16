// Script para criar ícones PWA
const fs = require('fs');
const path = require('path');

// Criar ícones placeholder simples (você pode substituir com ícones reais)
const createPlaceholderIcon = (size, filename) => {
  const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#000000"/>
  <text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial" font-size="${size/8}" font-weight="bold">BP</text>
</svg>
  `;
  
  fs.writeFileSync(path.join(__dirname, 'public', filename), svg);
  console.log(`✅ Criado ${filename} (${size}x${size})`);
};

// Criar ícones PWA
createPlaceholderIcon(192, 'icon-192.svg');
createPlaceholderIcon(512, 'icon-512.svg');

console.log('🎉 Ícones PWA criados com sucesso!');
console.log('📝 Substitua os arquivos SVG com seus próprios ícones quando desejar');
