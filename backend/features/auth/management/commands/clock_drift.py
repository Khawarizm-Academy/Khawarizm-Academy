# Compare the local clock with real time and say what to fix — the WSL
# drift that made every login 401 ("Token used too early") lives right here.
from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django.core.management.color import no_style

from features.auth import clock


class Command(BaseCommand):
    help = "Measure the local clock against real time and warn when the lag will break sign-in."

    def add_arguments(self, parser):
        parser.add_argument("--quiet", action="store_true", help="No output; exit code only.")

    def handle(self, *args, **options):
        style = no_style()
        drift = clock.drift_seconds()
        if options["quiet"]:
            if (drift or 0) > clock.DRIFT_LIMIT_SECONDS:
                raise CommandError(clock.CLOCK_FIX)
            return
        if drift is None:
            self.stdout.write(style.WARNING("تعذّر قياس التوقيت — الشبكة غير متاحة الآن؛ أعد المحاولة لاحقًا."))
            return
        self.stdout.write(self.style.SUCCESS(f"تفاوت الساعة: {drift} ثانية."))
        for line in clock.drift_warnings(drift):
            self.stdout.write(self.style.WARNING(line))
        if drift > clock.DRIFT_LIMIT_SECONDS:
            raise CommandError(f"ساعة النظام متأخرة {drift} ثانية — " + clock.CLOCK_FIX)
