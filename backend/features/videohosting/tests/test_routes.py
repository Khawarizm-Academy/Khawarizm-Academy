"""The streaming routes — meta, token mint, playlist rewrite, segment redirect."""

from __future__ import annotations

from features.common.choices import VideoStatus
from features.common.testing import ApiTestCase, authenticate

from features.videohosting.tests.helpers import KEY_HEX, make_asset


class ProviderRouteTests(ApiTestCase):
    def test_providers_route_requires_authentication(self):
        response = self.client.get("/api/videos/providers")
        self.assertEqual(response.status_code, 401)

    def test_providers_route_lists_the_registry(self):
        authenticate(self.client)
        response = self.client.get("/api/videos/providers")
        self.assertEqual(response.status_code, 200)
        payload = response.json()["results"]
        self.assertEqual([row["code"] for row in payload], ["google_drive", "telegram"])
        self.assertEqual(payload[0]["capabilities"]["resumableUpload"], True)


class RouteTests(ApiTestCase):
    def test_meta_route_returns_asset(self):
        make_asset()
        response = self.client.get("/api/videos/course-1--lesson-1")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], "course-1--lesson-1")

    def test_meta_route_404s_on_missing(self):
        response = self.client.get("/api/videos/nope")
        self.assertEqual(response.status_code, 404)

    def test_token_route_requires_authentication(self):
        make_asset()
        # Matching X-Forwarded-For keeps the minted binding consistent with the grant call.
        response = self.client.post("/api/videos/course-1--lesson-1/token", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertEqual(response.status_code, 401)

    def test_token_route_refuses_unready_asset(self):
        authenticate(self.client)
        make_asset(status=VideoStatus.PROCESSING)
        response = self.client.post("/api/videos/course-1--lesson-1/token", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertEqual(response.status_code, 409)

    def test_full_playback_flow_from_token_to_segment(self):
        authenticate(self.client)
        make_asset()
        minted = self.client.post("/api/videos/course-1--lesson-1/token", HTTP_X_FORWARDED_FOR="10.0.0.1").json()
        token = minted["token"]

        master = self.client.get(f"/api/stream/{token}/master.m3u8", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertEqual(master.status_code, 200)
        self.assertIn(f"/api/stream/{token}/360p/index.m3u8", master.content.decode())
        self.assertEqual(master["Cache-Control"], "no-store")

        media = self.client.get(f"/api/stream/{token}/360p/index.m3u8", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertIn(f"/api/stream/{token}/key/360p", media.content.decode())

        key = self.client.get(f"/api/stream/{token}/key/360p", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertEqual(bytes.fromhex(KEY_HEX), key.content)

        # The segment redirects to Telegram; only Location is asserted (no network call).
        segment = self.client.get(f"/api/stream/{token}/360p/0.ts", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertEqual(segment.status_code, 302)
        self.assertIn("api.telegram.org/file/", segment["Location"])

    def test_playback_routes_reject_a_foreign_ip(self):
        authenticate(self.client)
        make_asset()
        minted = self.client.post("/api/videos/course-1--lesson-1/token", HTTP_X_FORWARDED_FOR="10.0.0.1").json()
        response = self.client.get(f"/api/stream/{minted['token']}/master.m3u8", HTTP_X_FORWARDED_FOR="10.0.0.9")
        self.assertEqual(response.status_code, 403)

    def test_playback_routes_reject_an_unknown_token(self):
        response = self.client.get("/api/stream/not-a-real-token/master.m3u8")
        self.assertEqual(response.status_code, 403)

    def test_segment_route_404s_on_missing_index(self):
        authenticate(self.client)
        make_asset()
        minted = self.client.post("/api/videos/course-1--lesson-1/token", HTTP_X_FORWARDED_FOR="10.0.0.1").json()
        response = self.client.get(f"/api/stream/{minted['token']}/360p/99.ts", HTTP_X_FORWARDED_FOR="10.0.0.1")
        self.assertEqual(response.status_code, 404)
