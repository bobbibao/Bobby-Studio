/**
 * Universal Currency & Pricing Formatter for Bobby Studio
 * Supports USD ($) for English and VND (đ) for Vietnamese.
 * Strictly eliminates any legacy CHF / CHF0 currencies.
 */

export const formatCurrency = (usdAmount: number, language: string = 'en'): string => {
  const isViet = language?.toLowerCase().startsWith('vi');
  
  if (!usdAmount || usdAmount === 0) {
    return isViet ? '0 đ' : '$0';
  }

  if (isViet) {
    // 1 USD approx 25,000 VND standard studio conversion
    const vnd = Math.round(usdAmount * 25000);
    return `${new Intl.NumberFormat('vi-VN').format(vnd)} đ`;
  }

  return `$${new Intl.NumberFormat('en-US').format(Math.round(usdAmount))}`;
};

export const formatCurrencyMonthly = (usdAmount: number, language: string = 'en'): string => {
  const isViet = language?.toLowerCase().startsWith('vi');
  const formatted = formatCurrency(usdAmount, language);
  return `${formatted}${isViet ? '/tháng' : '/mo'}`;
};

export const formatCurrencyYearly = (usdAmount: number, language: string = 'en'): string => {
  const isViet = language?.toLowerCase().startsWith('vi');
  const formatted = formatCurrency(usdAmount, language);
  return `${formatted}${isViet ? '/năm' : '/yr'}`;
};

export const getCurrencyCode = (language: string = 'en'): string => {
  return language?.toLowerCase().startsWith('vi') ? 'VND' : 'USD';
};

export const getCurrencySymbol = (language: string = 'en'): string => {
  return language?.toLowerCase().startsWith('vi') ? 'đ' : '$';
};
