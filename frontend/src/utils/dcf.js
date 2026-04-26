function toNumber(value) {
  return Number(value);
}

export function calculateDcf(input) {
  const currentFcf = toNumber(input.currentFcf);
  const growthRate = toNumber(input.growthRate) / 100;
  const discountRate = toNumber(input.discountRate) / 100;
  const terminalGrowthRate = toNumber(input.terminalGrowthRate) / 100;
  const sharesOutstanding = toNumber(input.sharesOutstanding);
  const cash = toNumber(input.cash);
  const debt = toNumber(input.debt);
  const marketPrice = toNumber(input.marketPrice);

  const numericEntries = {
    currentFcf,
    growthRate,
    discountRate,
    terminalGrowthRate,
    sharesOutstanding,
    cash,
    debt,
    marketPrice,
  };

  const invalidField = Object.entries(numericEntries).find(([, value]) => Number.isNaN(value) || !Number.isFinite(value));
  if (invalidField) {
    throw new Error('Semua input DCF harus berupa angka yang valid.');
  }

  if (sharesOutstanding <= 0) {
    throw new Error('Jumlah saham beredar harus lebih besar dari 0.');
  }

  if (discountRate <= terminalGrowthRate) {
    throw new Error('Discount rate harus lebih besar dari terminal growth rate.');
  }

  const projections = [];
  let totalPvFcf = 0;

  for (let year = 1; year <= 5; year += 1) {
    const fcf = currentFcf * (1 + growthRate) ** year;
    const pvFcf = fcf / (1 + discountRate) ** year;
    totalPvFcf += pvFcf;

    projections.push({
      year,
      fcf,
      pvFcf,
    });
  }

  const yearFiveFcf = projections[projections.length - 1].fcf;
  const terminalValue = (yearFiveFcf * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
  const pvTerminalValue = terminalValue / (1 + discountRate) ** 5;
  const enterpriseValue = totalPvFcf + pvTerminalValue;
  const equityValue = enterpriseValue + cash - debt;
  const intrinsicValuePerShare = equityValue / sharesOutstanding;
  const premiumDiscountPercent = ((marketPrice - intrinsicValuePerShare) / intrinsicValuePerShare) * 100;

  let status = 'Fair';
  if (premiumDiscountPercent <= -10) {
    status = 'Undervalued';
  } else if (premiumDiscountPercent >= 10) {
    status = 'Overvalued';
  }

  return {
    projections,
    totalPvFcf,
    terminalValue,
    pvTerminalValue,
    enterpriseValue,
    equityValue,
    intrinsicValuePerShare,
    premiumDiscountPercent,
    status,
  };
}
