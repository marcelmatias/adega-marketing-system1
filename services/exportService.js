const PDFKit = require('pdfkit');
const logger = require('../utils/logger');

function formatMoney(val) {
  return `R$ ${(val || 0).toFixed(2)}`;
}

function escapeCsv(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function generateCsv(headers, rows) {
  const headerLine = headers.map(h => escapeCsv(h.label)).join(',');
  const dataLines = rows.map(row =>
    headers.map(h => escapeCsv(row[h.key] ?? '')).join(',')
  );
  return [headerLine, ...dataLines].join('\r\n');
}

function generatePdf(headers, rows, title, subtitulo, columns) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFKit({ margin: 40, size: 'A4', layout: columns === 1 ? 'portrait' : 'landscape' });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const pageW = columns === 1 ? 525 : 770;
      const leftMargin = 40;

      doc.fontSize(16).font('Helvetica-Bold').text(title, leftMargin, 40);
      if (subtitulo) {
        doc.fontSize(10).font('Helvetica').fillColor('#666').text(subtitulo, leftMargin, 65);
      }
      doc.fillColor('#000');

      const tableTop = subtitulo ? 90 : 75;
      const colWidth = Math.max(60, Math.floor((pageW - 20) / headers.length));

      doc.fontSize(8).font('Helvetica-Bold');
      let xPos = leftMargin;
      const headerHeight = 18;
      headers.forEach((h, i) => {
        const w = i === headers.length - 1 ? pageW - (xPos - leftMargin) : colWidth;
        doc.rect(xPos, tableTop, w, headerHeight).fill('#333');
        doc.fillColor('#fff').text(h.label, xPos + 3, tableTop + 4, { width: w - 6, align: 'left' });
        doc.fillColor('#000');
        xPos += w;
      });

      doc.font('Helvetica').fontSize(7);
      let yPos = tableTop + headerHeight + 4;

      rows.forEach((row, ri) => {
        if (yPos > 760) {
          doc.addPage();
          yPos = 40;
        }
        xPos = leftMargin;
        headers.forEach((h, i) => {
          const w = i === headers.length - 1 ? pageW - (xPos - leftMargin) : colWidth;
          if (ri % 2 === 1) {
            doc.rect(xPos, yPos - 2, w, 14).fill('#f5f5f5');
            doc.fillColor('#000');
          }
          const val = h.prefix && row[h.key] ? `${h.prefix} ${row[h.key]}` : (row[h.key] ?? '');
          doc.text(String(val), xPos + 2, yPos, { width: w - 4, align: 'left' });
          xPos += w;
        });
        yPos += 14;
      });

      const footerText = `Gerado por Rei da Adega em ${new Date().toLocaleString('pt-BR')}`;
      doc.fontSize(7).fillColor('#999').text(footerText, leftMargin, yPos + 10);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function exportFinanceiroCSV(registros) {
  const headers = [
    { key: 'tipo', label: 'Tipo' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'descricao', label: 'Descricao' },
    { key: 'valor', label: 'Valor' },
    { key: 'formaPagamento', label: 'Pagamento' },
    { key: 'status', label: 'Status' },
    { key: 'data', label: 'Data' },
  ];
  const rows = registros.map(r => ({
    tipo: r.tipo,
    categoria: r.categoria,
    descricao: r.descricao,
    valor: formatMoney(r.valor),
    formaPagamento: r.formaPagamento || '-',
    status: r.status,
    data: r.data ? new Date(r.data).toLocaleDateString('pt-BR') : '',
  }));
  return generateCsv(headers, rows);
}

async function exportFinanceiroPDF(registros, fluxo, subtitulo) {
  const headers = [
    { key: 'tipo', label: 'Tipo' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'descricao', label: 'Descricao' },
    { key: 'valor', label: 'Valor' },
    { key: 'status', label: 'Status' },
    { key: 'data', label: 'Data' },
  ];
  const rows = registros.map(r => ({
    tipo: r.tipo === 'receita' ? 'Receita' : 'Despesa',
    categoria: r.categoria,
    descricao: r.descricao,
    valor: formatMoney(r.valor),
    status: r.status,
    data: r.data ? new Date(r.data).toLocaleDateString('pt-BR') : '',
  }));

  const summary = fluxo ? [
    `Receitas: ${formatMoney(fluxo.receitas)}`,
    `Despesas: ${formatMoney(fluxo.despesas)}`,
    `Saldo: ${formatMoney(fluxo.saldo)}`,
  ].join(' | ') : '';

  const title = 'Relatorio Financeiro';
  const sub = [subtitulo, summary].filter(Boolean).join(' - ');
  return generatePdf(headers, rows, title, sub, 1);
}

function exportProdutosCSV(produtos) {
  const headers = [
    { key: 'nome', label: 'Nome' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'preco', label: 'Preco' },
    { key: 'custo', label: 'Custo' },
    { key: 'estoque', label: 'Estoque' },
    { key: 'estoqueMinimo', label: 'Est. Minimo' },
    { key: 'unidade', label: 'Unidade' },
    { key: 'volume', label: 'Volume' },
    { key: 'teorAlcoolico', label: 'Teor Alcoolico' },
    { key: 'ativo', label: 'Ativo' },
  ];
  const prefix = { key: 'preco', prefix: 'R$' };
  const rows = produtos.map(p => ({
    nome: p.nome,
    categoria: p.categoria,
    preco: formatMoney(p.preco),
    custo: formatMoney(p.custo || 0),
    estoque: p.estoque,
    estoqueMinimo: p.estoqueMinimo,
    unidade: p.unidade || '-',
    volume: p.volume || '-',
    teorAlcoolico: p.teorAlcoolico ? `${p.teorAlcoolico}%` : '-',
    ativo: p.ativo ? 'Sim' : 'Nao',
  }));
  return generateCsv(headers, rows);
}

async function exportProdutosPDF(produtos, subtitulo) {
  const headers = [
    { key: 'nome', label: 'Produto' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'preco', label: 'Preco' },
    { key: 'estoque', label: 'Estoque' },
    { key: 'unidade', label: 'Un' },
    { key: 'volume', label: 'Volume' },
  ];
  const rows = produtos.map(p => ({
    nome: p.nome,
    categoria: p.categoria,
    preco: formatMoney(p.preco),
    estoque: String(p.estoque),
    unidade: p.unidade || '-',
    volume: p.volume || '-',
  }));
  return generatePdf(headers, rows, 'Catalogo de Produtos', subtitulo, 1);
}

module.exports = {
  exportFinanceiroCSV,
  exportFinanceiroPDF,
  exportProdutosCSV,
  exportProdutosPDF,
};
