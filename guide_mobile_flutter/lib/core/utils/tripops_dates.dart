DateTime parseCalendarDate(Object? value) {
  final raw = value?.toString() ?? '';
  if (raw.length < 10) throw const FormatException('Thiếu ngày trong dữ liệu tour.');
  return DateTime.parse(raw.substring(0, 10));
}

String vnDate(DateTime value) {
  final d = value.day.toString().padLeft(2, '0');
  final m = value.month.toString().padLeft(2, '0');
  return '$d/$m/${value.year}';
}
