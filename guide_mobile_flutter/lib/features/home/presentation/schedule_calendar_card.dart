import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/tripops_dates.dart';
import '../../../core/widgets/guide_glass.dart';
import '../../../core/widgets/guide_ui.dart';
import '../../assigned_tours/domain/booking_models.dart';
import '../../assigned_tours/domain/tour_catalog.dart';
import '../domain/home_trip_picker.dart';

const _completedColor = Color(0xFF427AB4);
const _completedTint = Color(0xFFEAF2FD);

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
  int _direction = 1;

  DateTime _dateOnly(DateTime date) => DateTime(date.year, date.month, date.day);

  @override
  void initState() {
    super.initState();
    _today = _dateOnly(widget.today ?? DateTime.now());
    _visibleMonth = DateTime(_today.year, _today.month, 1);
    _selectedDate = _today;
  }

  @override
  void didUpdateWidget(covariant ScheduleCalendarCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    final nextToday = _dateOnly(widget.today ?? DateTime.now());
    if (nextToday != _today) {
      final wasToday = _selectedDate == _today;
      _today = nextToday;
      if (wasToday) {
        _selectedDate = _today;
        _visibleMonth = DateTime(_today.year, _today.month, 1);
      }
    }
  }

  void _changeMonth(int delta) {
    setState(() {
      _direction = delta;
      _visibleMonth = DateTime(_visibleMonth.year, _visibleMonth.month + delta);
      _selectedDate = _visibleMonth.year == _today.year &&
              _visibleMonth.month == _today.month
          ? _today
          : _visibleMonth;
    });
  }

  void _goToday() {
    setState(() {
      final currentMonth = DateTime(_today.year, _today.month);
      _direction = currentMonth.isBefore(_visibleMonth) ? -1 : 1;
      _visibleMonth = currentMonth;
      _selectedDate = _today;
    });
  }

  List<BookingSummary> _toursOn(DateTime date) => bookingsForCalendarDay(
    widget.bookings,
    date,
    inProgressEndDates: widget.inProgressEndDates,
  );

  @override
  Widget build(BuildContext context) {
    final selectedTours = _toursOn(_selectedDate);
    final duration = MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : const Duration(milliseconds: 220);

    return GuideGlass(
      radius: 28,
      blurSigma: 0,
      shadow: false,
      highlightTint: const Color(0xF2FFFFFF),
      tint: const Color(0xC9FFFFFF),
      padding: const EdgeInsets.fromLTRB(12, 14, 12, 14),
      child: Material(
        type: MaterialType.transparency,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${_visibleMonth.year}', style: const TextStyle(
                          color: muted, fontSize: 12, fontWeight: FontWeight.w500,
                        )),
                        Text('Tháng ${_visibleMonth.month}', style: const TextStyle(
                          color: ink, fontSize: 24, fontWeight: FontWeight.w700,
                          letterSpacing: -0.6,
                        )),
                      ],
                    ),
                  ),
                  _MonthButton(
                    key: const ValueKey('calendar-prev-month'),
                    tooltip: 'Tháng trước',
                    icon: Icons.chevron_left_rounded,
                    onPressed: () => _changeMonth(-1),
                  ),
                  const SizedBox(width: 4),
                  _MonthButton(
                    key: const ValueKey('calendar-next-month'),
                    tooltip: 'Tháng sau',
                    icon: Icons.chevron_right_rounded,
                    onPressed: () => _changeMonth(1),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                key: const ValueKey('calendar-today'),
                style: TextButton.styleFrom(
                  backgroundColor: const Color(0xBFFFFFFF),
                  foregroundColor: deepTeal,
                  minimumSize: const Size(0, 44),
                  shape: const StadiumBorder(),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                ),
                onPressed: _goToday,
                child: const Text('Hôm nay', style: TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                for (final label in const ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'])
                  Expanded(child: Center(child: Text(label, style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: label == 'CN' ? const Color(0xFFAB5555) : muted,
                  )))),
              ],
            ),
            const SizedBox(height: 6),
            ClipRect(
              child: AnimatedSwitcher(
                duration: duration,
                switchInCurve: Curves.easeOutCubic,
                switchOutCurve: Curves.easeIn,
                transitionBuilder: (child, animation) => FadeTransition(
                  opacity: animation,
                  child: SlideTransition(
                    position: Tween<Offset>(
                      begin: Offset(_direction * 0.12, 0),
                      end: Offset.zero,
                    ).animate(animation),
                    child: child,
                  ),
                ),
                child: _buildMonthGrid(duration),
              ),
            ),
            const SizedBox(height: 12),
            const Wrap(
              alignment: WrapAlignment.center,
              spacing: 12,
              runSpacing: 8,
              children: [
                _LegendDot(color: teal, label: 'Đang / Sắp dẫn'),
                _LegendDot(color: _completedColor, label: 'Đã hoàn thành'),
                _LegendOutline(label: 'Hôm nay'),
              ],
            ),
            const Divider(height: 24, color: line),
            Text(
              'Lịch ngày ${vnDate(_selectedDate)}',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: ink),
            ),
            const SizedBox(height: 8),
            if (selectedTours.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 14),
                child: Row(
                  children: [
                    Icon(Icons.event_available_outlined, size: 25, color: muted),
                    SizedBox(width: 10),
                    Expanded(child: Text('Không có lịch dẫn tour', style: TextStyle(
                      fontSize: 13, color: muted,
                    ))),
                  ],
                ),
              )
            else
              ...selectedTours.map((tour) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _CalendarEvent(
                  tour: tour,
                  onTap: () => widget.onOpenTour(tour),
                ),
              )),
          ],
        ),
      ),
    );
  }

  Widget _buildMonthGrid(Duration duration) {
    final month = _visibleMonth;
    final daysInMonth = DateUtils.getDaysInMonth(month.year, month.month);
    final leadingEmpty = (month.weekday + 6) % 7;
    final totalCells = ((leadingEmpty + daysInMonth + 6) ~/ 7) * 7;

    return LayoutBuilder(
      key: ValueKey('calendar-month-${month.year}-${month.month}'),
      builder: (context, constraints) {
        final cellWidth = (constraints.maxWidth - 12) / 7;
        final rowHeight = math.max(
          math.max(cellWidth, 44.0),
          MediaQuery.textScalerOf(context).scale(14) * 1.3 + 15,
        );
        return GridView.builder(
          key: const ValueKey('calendar-grid'),
          // Nested grids must not inherit Scaffold's header / bottom-bar padding.
          padding: EdgeInsets.zero,
          primary: false,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: totalCells,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 7,
            crossAxisSpacing: 2,
            mainAxisSpacing: 2,
            mainAxisExtent: rowHeight,
          ),
          itemBuilder: (context, index) {
            final day = index - leadingEmpty + 1;
            if (day < 1 || day > daysInMonth) return const SizedBox.shrink();

            final date = DateTime(month.year, month.month, day);
            final tours = _toursOn(date);
            final active = tours.any((tour) => tour.isActive);
            final completed = tours.any((tour) => tour.isCompleted);
            final isSelected = date == _selectedDate;
            final isToday = date == _today;
            final hasTour = tours.isNotEmpty;
            final background = isSelected ? teal : active ? paleTeal
                : completed ? _completedTint : Colors.transparent;
            final foreground = isSelected ? Colors.white : active ? deepTeal
                : completed ? _completedColor : ink;

            return Semantics(
              button: true,
              selected: isSelected,
              label: '${vnDate(date)}${isToday ? ", hôm nay" : ""}${hasTour ? ", ${tours.length} tour" : ""}',
              excludeSemantics: true,
              onTap: () => setState(() => _selectedDate = date),
              child: InkWell(
                key: ValueKey('cal-day-${date.year}-${date.month}-${date.day}'),
                borderRadius: BorderRadius.circular(30),
                onTap: () => setState(() => _selectedDate = date),
                child: Center(
                  child: AnimatedContainer(
                    duration: duration,
                    curve: Curves.easeOutCubic,
                    width: cellWidth,
                    height: rowHeight,
                    decoration: BoxDecoration(
                      color: background,
                      borderRadius: BorderRadius.circular(40),
                      border: isToday && !isSelected
                          ? Border.all(color: teal, width: 1.4)
                          : null,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('$day', style: TextStyle(
                          fontSize: 14,
                          height: 1.2,
                          fontWeight: isSelected || isToday || hasTour
                              ? FontWeight.w700 : FontWeight.w500,
                          color: foreground,
                        )),
                        const SizedBox(height: 4),
                        SizedBox(
                          height: 5,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              if (active) _Dot(color: isSelected ? Colors.white : teal),
                              if (active && completed) const SizedBox(width: 3),
                              if (completed) _Dot(color: isSelected ? Colors.white : _completedColor),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _MonthButton extends StatelessWidget {
  const _MonthButton({super.key, required this.tooltip, required this.icon, required this.onPressed});
  final String tooltip;
  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: tooltip,
    onPressed: onPressed,
    style: IconButton.styleFrom(
      backgroundColor: const Color(0xCFFFFFFF),
      foregroundColor: ink,
      minimumSize: const Size(44, 44),
      shape: const CircleBorder(),
    ),
    icon: Icon(icon, size: 23),
  );
}

class _CalendarEvent extends StatelessWidget {
  const _CalendarEvent({required this.tour, required this.onTap});
  final BookingSummary tour;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final accent = tour.isCompleted ? _completedColor : deepTeal;
    final date = tour.endDate != null && vnDate(tour.endDate!) != vnDate(tour.startDate)
        ? '${vnDate(tour.startDate)} – ${vnDate(tour.endDate!)}'
        : vnDate(tour.startDate);
    return Material(
      color: const Color(0xBFFFFFFF),
      borderRadius: BorderRadius.circular(17),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey('calendar-tour-${tour.id}'),
        onTap: onTap,
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(width: 4, color: accent),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(11),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(tour.name, style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w700, color: ink,
                      )),
                      const SizedBox(height: 4),
                      Text(tour.code, style: const TextStyle(fontSize: 12, color: muted)),
                      Text('$date · ${tour.guestCount} khách',
                        style: const TextStyle(fontSize: 12, color: muted)),
                      const SizedBox(height: 6),
                      GuideStatusPill(
                        bookingStatusLabel(tour.status),
                        background: tour.isCompleted ? _completedTint : paleTeal,
                        foreground: accent,
                      ),
                    ],
                  ),
                ),
              ),
              const Padding(
                padding: EdgeInsets.only(right: 10),
                child: Center(child: Icon(Icons.chevron_right_rounded, color: muted, size: 20)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot({required this.color});
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    width: 5,
    height: 5,
    decoration: BoxDecoration(color: color, shape: BoxShape.circle),
  );
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      _Dot(color: color),
      const SizedBox(width: 5),
      Text(label, style: const TextStyle(fontSize: 11, color: muted)),
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
          shape: BoxShape.circle,
          border: Border.all(color: teal, width: 1.4),
        ),
      ),
      const SizedBox(width: 5),
      Text(label, style: const TextStyle(fontSize: 11, color: muted)),
    ],
  );
}
