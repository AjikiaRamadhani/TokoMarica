export function validateText(value: unknown, field: string, maxLength = 200) {
  if (typeof value !== "string") {
    return { error: `${field} harus berupa teks` };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { error: `${field} tidak boleh kosong` };
  }

  if (trimmed.length > maxLength) {
    return { error: `${field} terlalu panjang` };
  }

  return { value: trimmed };
}

export function validateOptionalText(value: unknown, field: string, maxLength = 200) {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }

  if (typeof value !== "string") {
    return { error: `${field} harus berupa teks` };
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return { error: `${field} terlalu panjang` };
  }

  return { value: trimmed || null };
}

export function validateInteger(value: unknown, field: string, min = 0) {
  if (!Number.isInteger(value) || Number(value) < min) {
    return { error: `${field} tidak valid` };
  }

  return { value: Number(value) };
}

export function validatePhone(value: unknown, field = "Nomor telepon") {
  const result = validateText(value, field, 15);
  if (result.error) return result;
  if (typeof result.value !== "string" || !/^[0-9]{8,15}$/.test(result.value)) {
    return { error: `${field} harus berupa angka 8-15 digit` };
  }
  return result;
}

export function validatePostalCode(value: unknown, field = "Kode pos") {
  const result = validateText(value, field, 5);
  if (result.error) return result;
  if (typeof result.value !== "string" || !/^[0-9]{5}$/.test(result.value)) {
    return { error: `${field} harus berupa 5 digit angka` };
  }
  return result;
}

export function validateAddress(value: unknown, field = "Alamat") {
  const result = validateText(value, field, 500);
  if (result.error) return result;
  if (typeof result.value !== "string" || result.value.length < 10) {
    return { error: `${field} harus diisi dengan alamat yang lengkap` };
  }
  return result;
}
