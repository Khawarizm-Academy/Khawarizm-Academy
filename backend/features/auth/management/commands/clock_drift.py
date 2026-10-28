# Compare the local clock with real time and say what to fix -- on a network
# that blocks NTP (UDP/123) the unsynced dev clock fails every sign-in
# ("Token used too early") and this command measures exactly that.
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
            self.stdout.write(
                style.WARNING("Could not measure the clock -- the network is unreachable; try again later.")
            )
            return
        # Terminal output stays ASCII -- the actionable Arabic detail lives in
        # the 401 the browser shows, not here.
        self.stdout.write(self.style.SUCCESS(f"Clock drift: {drift} s."))
        for line in clock.drift_warnings(drift):
            self.stdout.write(self.style.WARNING(line))
        if drift > clock.DRIFT_LIMIT_SECONDS:
            raise CommandError(f"System clock lags by {drift} s -- " + clock.CLOCK_FIX)
