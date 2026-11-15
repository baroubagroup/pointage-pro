import 'package:flutter_test/flutter_test.dart';
import 'package:pointage_mobile/main.dart';

void main() {
  testWidgets('PointageApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const PointageApp());
    expect(find.byType(PointageApp), findsOneWidget);
  });
}
