export type ProvinceOption = { code: string; name: string; fullName: string };
export type WardOption = { code: string; name: string; provinceCode: string };

export function findProvince(provinces: ProvinceOption[], name: string) {
  const normalize = (value: string) => value.trim().normalize("NFC").replace(/^(tỉnh|thành phố)\s+/i, "").toLocaleLowerCase("vi-VN");
  return provinces.find(p => normalize(p.name) === normalize(name) || normalize(p.fullName) === normalize(name));
}

export function validServiceAddress(provinces: ProvinceOption[], province: string, wards: WardOption[], ward: string) {
  const selected = findProvince(provinces, province);
  return !!selected && wards.some(w => w.provinceCode === selected.code && w.name === ward);
}
