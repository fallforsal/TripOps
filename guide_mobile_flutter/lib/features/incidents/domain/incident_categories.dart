/// Values must match backend IncidentTypeRules and the Agency booking detail.
class IncidentCategoryOption {
  const IncidentCategoryOption(this.code, this.label);

  final String code;
  final String label;
}

const incidentCategories = <IncidentCategoryOption>[
  IncidentCategoryOption('HEALTH', 'Y tế & Sức khỏe'),
  IncidentCategoryOption('VEHICLE', 'Phương tiện di chuyển'),
  IncidentCategoryOption('WEATHER', 'Thời tiết & Thiên tai'),
  IncidentCategoryOption('CUSTOMER', 'Khách hàng & Thành viên'),
  IncidentCategoryOption('SECURITY', 'An ninh & An toàn'),
  IncidentCategoryOption('SERVICE_PROVIDER', 'Dịch vụ & Nhà cung cấp'),
  IncidentCategoryOption('SCHEDULE', 'Lịch trình & Thời gian'),
  IncidentCategoryOption('OTHER', 'Sự cố khác'),
];
