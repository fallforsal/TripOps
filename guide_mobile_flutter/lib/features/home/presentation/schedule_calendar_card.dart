import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/tripops_dates.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../assigned_tours/domain/booking_models.dart';
import '../../assigned_tours/domain/tour_catalog.dart';
import '../domain/home_trip_picker.dart';

class ScheduleCalendarCard extends StatefulWidget {
  const ScheduleCalendarCard({
    super.key,
    required this.bookings,
    required this.inProgressEndDates,
    required this.onOpenTour,
    this.today,
  });

  final List<BookingSummary> bookings;
  final Map<int, DateTime> inProgressEndDates;
  final ValueChanged<BookingSummary> onOpenTour;
  final DateTime? today;

  @override
  State<ScheduleCalendarCard> createState() => _ScheduleCalendarCardState();
}

class _ScheduleCalendarCardState extends State<ScheduleCalendarCard> {
  late DateTime _today;
  late DateTime _visibleMonth;
  late DateTime _selectedDate;

  @override
  void initState() {
    super.initState();
    final now = widget.today ?? DateTime.now();
    _today = DateTime(now.year, now.month, now.day);
    _visibleMonth = DateTime(_today.year, _today.month, 1);
    _selectedDate = _today;
  }

  void _changeMonth(int delta) {
    setState(() {
      _visibleMonth = DateTime(_visibleMonth.year, _visibleMonth.month + delta, 1);
    });
  }

  @override
  Widget build(BuildContext context) {
    final daysInMonth = DateUtils.getDaysInMonth(_visibleMonth.year, _visibleMonth.month);
    final leadingEmpty = (_visibleMonth.weekday + 6) % 7; // Monday = 0
    final totalCells = ((leadingEmpty + daysInMonth + 6) ~/ 7) * 7;
    final selectedTours = bookingsForCalendarDay(
      widget.bookings,
      _selectedDate,
      inProgressEndDates: widget.inProgressEndDates,
    );

    const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                IconButton(
                  key: const ValueKey('calendar-prev-month'),
                  tooltip: 'Tháng trước',
                  visualDensity: VisualDensity.compact,
                  onPressed: () => _changeMonth(-1),
                  icon: const Icon(Icons.chevron_left_rounded, color: ink),
                ),
                Expanded(
                  child: Center(
                    child: Text(
                      'Tháng ${_visibleMonth.month}/${_visibleMonth.year}',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: ink,
                      ),
                    ),
                  ),
                ),
                IconButton(
                  key: const ValueKey('calendar-next-month'),
                  tooltip: 'Tháng sau',
                  visualDensity: VisualDensity.compact,
                  onPressed: () => _changeMonth(1),
                  icon: const Icon(Icons.chevron_right_rounded, color: ink),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: weekdays
                  .map(
                    (label) => Expanded(
                      child: Center(
                        child: Text(
                          label,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: muted,
                          ),
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 6),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: totalCells,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 7,
                mainAxisSpacing: 4,
                crossAxisSpacing: 4,
                childAspectRatio: 1.05,
              ),
              itemBuilder: (context, index) {
                final dayNumber = index - leadingEmpty + 1;
                if (dayNumber < 1 || dayNumber > daysInMonth) {
                  return const SizedBox.shrink();
                }
                final date = DateTime(_visibleMonth.year, _visibleMonth.month, dayNumber);
                final tours = bookingsForCalendarDay(
                  widget.bookings,
                  date,
                  inProgressEndDates: widget.inProgressEndDates,
                );
                final hasTour = tours.isNotEmpty;
                final hasActiveTour = tours.any((t) => t.isActive);
                final isToday = date == _today;
                final isSelected = date == _selectedDate;

                final bgColor = isSelected
                    ? teal
                    : hasTour
                        ? (hasActiveTour ? paleTeal : const Color(0xFFEAF2FD))
                        : Colors.transparent;
                final textColor = isSelected
                    ? Colors.white
                    : hasTour
                        ? (hasActiveTour ? deepTeal : const Color(0xFF427AB4))
                        : ink;
                final dotColor = isSelected
                    ? Colors.white
                    : hasActiveTour
                        ? teal
                        : const Color(0xFF427AB4);

                return InkWell(
                  key: ValueKey('cal-day-${date.year}-${date.month}-${date.day}'),
                  borderRadius: BorderRadius.circular(10),
                  onTap: () => setState(() => _selectedDate = date),
                  child: Container(
                    decoration: BoxDecoration(
                      color: bgColor,
                      borderRadius: BorderRadius.circular(10),
                      border: isToday && !isSelected
                          ? Border.all(color: teal, width: 1.4)
                          : null,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '$dayNumber',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: hasTour || isToday || isSelected
                                ? FontWeight.w800
                                : FontWeight.w500,
                            color: textColor,
                          ),
                        ),
                        if (hasTour) ...[
                          const SizedBox(height: 2),
                          Container(
                            width: 5,
                            height: 5,
                            decoration: BoxDecoration(
                              color: dotColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                _LegendDot(color: teal, label: 'Đang / Sắp dẫn'),
                const SizedBox(width: 14),
                const _LegendDot(color: Color(0xFF427AB4), label: 'Đã hoàn thành'),
                const SizedBox(width: 14),
                _LegendOutline(label: 'Hôm nay'),
              ],
            ),
            const Divider(height: 20, color: line),
            if (selectedTours.isEmpty)
              Text(
                'Không có lịch dẫn tour ngày ${vnDate(_selectedDate)}.',
                style: const TextStyle(fontSize: 12, color: muted),
              )
            else ...[
              Text(
                'Lịch ngày ${vnDate(_selectedDate)} (${selectedTours.length} tour)',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: ink,
                ),
              ),
              const SizedBox(height: 8),
              ...selectedTours.map((tour) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: InkWell(
                  borderRadius: BorderRadius.circular(11),
                  onTap: () => widget.onOpenTour(tour),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FBFA),
                      borderRadius: BorderRadius.circular(11),
                      border: Border.all(color: line),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                tour.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: ink,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                tour.endDate != null && vnDate(tour.endDate!) != vnDate(tour.startDate)
                                    ? '${tour.code}  •  ${vnDate(tour.startDate)} – ${vnDate(tour.endDate!)}'
                                    : '${tour.code}  •  ${vnDate(tour.startDate)}',
                                style: const TextStyle(fontSize: 11, color: muted),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        GuideStatusPill(
                          bookingStatusLabel(tour.status),
                          background: tour.isCompleted ? const Color(0xFFEAF2FD) : paleTeal,
                          foreground: tour.isCompleted ? const Color(0xFF427AB4) : deepTeal,
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.chevron_right_rounded, size: 18, color: muted),
                      ],
                    ),
                  ),
                ),
              )),
            ],
          ],
        ),
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      ),
      const SizedBox(width: 5),
      Text(label, style: const TextStyle(fontSize: 10.5, color: muted, fontWeight: FontWeight.w600)),
    ],
  );
}

class _LegendOutline extends StatelessWidget {
  const _LegendOutline({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 9,
        height: 9,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(3),
          border: Border.all(color: teal, width: 1.4),
        ),
      ),
      const SizedBox(width: 5),
      Text(label, style: const TextStyle(fontSize: 10.5, color: muted, fontWeight: FontWeight.w600)),
    ],
  );
}
