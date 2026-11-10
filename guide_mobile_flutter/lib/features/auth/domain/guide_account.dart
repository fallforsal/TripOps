class GuideAccount {
  const GuideAccount({required this.id, required this.name, required this.email, required this.role, this.phone});
  final String id;
  final String name;
  final String email;
  final String role;
  final String? phone;

  factory GuideAccount.fromJson(Map<String, dynamic> j) => GuideAccount(
    id: (j['id'] ?? '').toString(),
    name: (j['name'] ?? '').toString(),
    email: (j['email'] ?? '').toString(),
    role: (j['role'] ?? '').toString(),
    phone: j['phone']?.toString(),
  );
}
