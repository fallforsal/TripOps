/// Formats passenger telephone data returned by BookingDto.participants.
/// Preserve the displayed value exactly as stored; normalize only for dialing.
String? passengerPhone(String? raw) {
  final value = raw?.trim();
  return value == null || value.isEmpty ? null : value;
}

/// Only allow telephone digits and an optional leading + in the dialer URI.
/// Reject free-form notes or malformed values instead of launching bad intents.
String? dialablePassengerPhone(String? raw) {
  final displayed = passengerPhone(raw);
  if (displayed == null) return null;
  final normalized = displayed.replaceAll(RegExp(r'[\s().-]'), '');
  if (!RegExp(r'^\+?[0-9]{9,15}$').hasMatch(normalized)) return null;
  return normalized;
}
