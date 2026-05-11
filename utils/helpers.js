const formatMoney = (value) => {
  return 'R$ ' + (value || 0).toFixed(2).replace('.', ',');
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('pt-BR');
};

const pagination = (page, total, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page: +page,
    limit: +limit,
    total,
    totalPages,
    hasNext: +page < totalPages,
    hasPrev: +page > 1,
  };
};

module.exports = { formatMoney, formatDate, formatDateTime, pagination };
