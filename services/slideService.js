const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SLIDE_W = 1920;
const SLIDE_H = 1080;

function escapeXml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function createSlideSVG(adega, produto, idx, total) {
  const nome = escapeXml(produto.nome || '');
  const categoria = escapeXml(produto.categoria || '');
  const unidade = escapeXml(produto.unidade || 'un');
  const preco = produto.preco != null ? produto.preco.toFixed(2).replace('.', ',') : '---';
  const descricao = escapeXml(produto.descricao || '');
  const adegaNome = escapeXml(adega.nome || 'Adega');
  const logo = adega.logo || '';
  const hasLogo = !!logo;

  const logoBlock = hasLogo
    ? `<image x="60" y="40" width="80" height="80" href="${escapeXml(logo)}" preserveAspectRatio="xMinYMid meet"/>`
    : '';

  return `<svg width="${SLIDE_W}" height="${SLIDE_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#16213e"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e74c3c"/>
      <stop offset="100%" stop-color="#c0392b"/>
    </linearGradient>
  </defs>
  <rect width="${SLIDE_W}" height="${SLIDE_H}" fill="url(#bg)"/>

  <!-- Top bar -->
  <rect x="0" y="0" width="${SLIDE_W}" height="120" fill="rgba(0,0,0,0.3)"/>
  ${logoBlock}
  <text x="${hasLogo ? 160 : 60}" y="85" fill="white" font-size="36" font-family="Segoe UI,sans-serif" font-weight="700">${adegaNome}</text>
  <text x="${SLIDE_W - 60}" y="85" text-anchor="end" fill="#e74c3c" font-size="24" font-family="Segoe UI,sans-serif">AO VIVO</text>
  <circle cx="${SLIDE_W - 75}" cy="68" r="8" fill="#e74c3c"><animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite"/></circle>

  <!-- Product image placeholder -->
  <rect x="500" y="200" width="920" height="520" rx="16" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
  <text x="960" y="520" text-anchor="middle" fill="rgba(255,255,255,0.1)" font-size="64" font-family="Segoe UI,sans-serif">${nome}</text>

  <!-- Product info (right side) -->
  <text x="80" y="320" fill="white" font-size="56" font-family="Segoe UI,sans-serif" font-weight="700">${nome}</text>
  <text x="80" y="380" fill="#e74c3c" font-size="28" font-family="Segoe UI,sans-serif">${categoria} &#8226; ${unidade}</text>

  <!-- Price -->
  <text x="80" y="500" fill="white" font-size="24" font-family="Segoe UI,sans-serif">Preco</text>
  <text x="80" y="560" fill="#2ecc71" font-size="64" font-family="Segoe UI,sans-serif" font-weight="700">R$ ${preco}</text>

  ${descricao ? `<text x="80" y="640" fill="rgba(255,255,255,0.7)" font-size="22" font-family="Segoe UI,sans-serif" font-style="italic">${descricao}</text>` : ''}

  <!-- Bottom bar -->
  <rect x="0" y="${SLIDE_H - 80}" width="${SLIDE_W}" height="80" fill="rgba(0,0,0,0.3)"/>
  <text x="60" y="${SLIDE_H - 35}" fill="rgba(255,255,255,0.5)" font-size="18" font-family="Segoe UI,sans-serif">${adegaNome} &#8226; Ao Vivo &#8226; Produto ${idx + 1} de ${total}</text>
  <text x="${SLIDE_W - 60}" y="${SLIDE_H - 35}" text-anchor="end" fill="rgba(255,255,255,0.5)" font-size="18" font-family="Segoe UI,sans-serif">youtube.com/&#64;${escapeXml(adegaNome.replace(/\s/g,''))}</text>
</svg>`;
}

async function generateSlides(adega, produtos, outputDir) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.png'));
  for (const f of files) fs.unlinkSync(path.join(outputDir, f));

  if (!produtos || produtos.length === 0) {
    const svg = `<svg width="${SLIDE_W}" height="${SLIDE_H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${SLIDE_W}" height="${SLIDE_H}" fill="#1a1a2e"/>
      <text x="960" y="540" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="40" font-family="Segoe UI,sans-serif">Nenhum produto disponivel</text>
    </svg>`;
    await sharp(Buffer.from(svg)).png().toFile(path.join(outputDir, 'slide_001.png'));
    return;
  }

  for (let i = 0; i < produtos.length; i++) {
    const svg = createSlideSVG(adega, produtos[i], i, produtos.length);
    const filename = `slide_${String(i + 1).padStart(3, '0')}.png`;
    await sharp(Buffer.from(svg)).png().toFile(path.join(outputDir, filename));
  }
}

module.exports = { generateSlides };
