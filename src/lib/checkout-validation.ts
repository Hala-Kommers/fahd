export type CheckoutDetails = {
  customerName: string;
  customerPhone: string;
  cityId: string;
  addressRaw: string;
  nationalAddress: string;
};

export type CheckoutErrors = Partial<Record<keyof CheckoutDetails, string>>;

function normalizeDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776));
}

export function normalizeNationalAddress(value: string) {
  return normalizeDigits(value).replace(/\s/g, '').toUpperCase();
}

export function formatDeliveryAddress(address: string, nationalAddress: string) {
  const detailedAddress = address.trim();
  const shortAddress = normalizeNationalAddress(nationalAddress);
  return shortAddress ? `${detailedAddress}\nالعنوان الوطني المختصر: ${shortAddress}` : detailedAddress;
}

function validSaudiPhone(value: string) {
  let phone = normalizeDigits(value)
    .replace(/[\s()-]/g, '')
    .replace(/^\+/, '')
    .replace(/^00/, '');
  if (phone.startsWith('05')) phone = `966${phone.slice(1)}`;
  return /^9665\d{8}$/.test(phone);
}

export function validateCheckoutDetails(details: CheckoutDetails): CheckoutErrors {
  const errors: CheckoutErrors = {};
  if (!details.customerName.trim()) errors.customerName = 'اكتب اسمك الكامل.';

  if (!details.customerPhone.trim()) errors.customerPhone = 'اكتب رقم جوالك للتواصل بشأن الطلب.';
  else if (!validSaudiPhone(details.customerPhone)) errors.customerPhone = 'اكتب رقم جوال سعودي: 05 ثم ٨ أرقام، أو +9665 ثم ٨ أرقام.';

  const city = details.cityId.trim();
  if (!city) errors.cityId = 'اختر مدينة التوصيل.';
  else if (!/^\d+$/.test(city) || !Number.isSafeInteger(Number(city)) || Number(city) <= 0) errors.cityId = 'اختر مدينة من القائمة.';

  const nationalAddress = normalizeNationalAddress(details.nationalAddress);
  if (nationalAddress && !/^[A-Z]{4}\d{4}$/.test(nationalAddress)) errors.nationalAddress = 'العنوان المختصر: ٤ أحرف إنجليزية ثم ٤ أرقام، مثل ABCD1234.';

  if (!details.addressRaw.trim()) errors.addressRaw = 'اكتب الحي والشارع ورقم المبنى لتوصيل طلبك.';
  return errors;
}
