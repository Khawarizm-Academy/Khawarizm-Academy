"""Offline URL parser corpora for link providers."""

from __future__ import annotations

import json
from pathlib import Path
from unittest import TestCase

from features.videohosting.providers.external import parse_reference as parse_external
from features.videohosting.providers.vimeo import embed_url as vimeo_embed_url
from features.videohosting.providers.vimeo import parse_reference as parse_vimeo
from features.videohosting.providers.youtube import embed_url as youtube_embed_url
from features.videohosting.providers.youtube import parse_reference as parse_youtube

SHARED_URL_VECTORS = Path(__file__).resolve().parents[4] / "shared" / "lib" / "videoUrlVectors.json"
PARSERS = {"youtube": parse_youtube, "vimeo": parse_vimeo, "external": parse_external}


class SharedVideoURLVectorsTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.vectors = json.loads(SHARED_URL_VECTORS.read_text(encoding="utf-8"))

    def test_shared_valid_vectors_are_accepted_by_the_matching_server_parser(self):
        for vector in self.vectors["valid"]:
            with self.subTest(url=vector["url"], provider=vector["provider"]):
                reference = PARSERS[vector["provider"]](vector["url"])
                self.assertIsNotNone(reference)
                self.assertEqual(reference[0], vector["provider"])

    def test_shared_invalid_vectors_are_rejected_by_every_server_parser(self):
        for vector in self.vectors["invalid"]:
            with self.subTest(url=vector["url"], reason=vector["reason"]):
                results = {provider: parser(vector["url"]) for provider, parser in PARSERS.items()}
                self.assertTrue(all(reference is None for reference in results.values()), results)


class YouTubeReferenceTests(TestCase):
    valid_urls = (
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtube.com/watch?v=abcdefghijk&t=42",
        "https://m.youtube.com/watch?t=4&v=12345678901",
        "https://music.youtube.com/watch?list=PL1&v=_-abC123456",
        "https://youtu.be/dQw4w9WgXcQ",
        "https://youtu.be/dQw4w9WgXcQ/",
        "https://www.youtube.com/embed/dQw4w9WgXcQ",
        "https://www.youtube.com/embed/dQw4w9WgXcQ/",
        "https://www.youtube.com/shorts/abcdefghijk",
        "https://www.youtube.com/watch?v=ZzZzZzZzZz1&feature=share",
        "HTTPS://WWW.YOUTUBE.COM/watch?v=dQw4w9WgXcQ",
        "https://www.youtube.com/watch?si=opaque&v=abcdefghijk&pp=abc",
    )
    hostile_urls = (
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "//evil.example/video",
        "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://user:pass@www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://www.yоutube.com/watch?v=dQw4w9WgXcQ",
        "https://www.youtube.com:443/watch?v=dQw4w9WgXcQ",
        "https://www.youtube.com/watch?v=short",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQQ",
        "https://www.youtube.com/watch?v=dQw4w9Wg!Q",
        "https://www.youtube.com/embed/dQw4w9WgXcQ/trailing",
        "https://youtu.be/dQw4w9WgXcQ/garbage",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&v=abcdefghijk",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ#fragment",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ%0Aevil",
        "https://www.youtube.com/watch?v=" + "a" * 600,
    )

    def test_valid_corpus(self):
        for url in self.valid_urls:
            with self.subTest(url=url):
                reference = parse_youtube(url)
                self.assertIsNotNone(reference)
                self.assertEqual(reference[0], "youtube")
                self.assertEqual(reference[2], f"https://www.youtube.com/watch?v={reference[1]}")

    def test_hostile_corpus(self):
        for url in self.hostile_urls:
            with self.subTest(url=url):
                self.assertIsNone(parse_youtube(url))

    def test_embed_url_is_fixed_to_the_privacy_enhanced_origin(self):
        self.assertEqual(
            youtube_embed_url("dQw4w9WgXcQ"),
            "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?enablejsapi=1&rel=0&modestbranding=1&playsinline=1",
        )


class VimeoReferenceTests(TestCase):
    valid_urls = (
        "https://vimeo.com/123456789",
        "https://www.vimeo.com/123456789",
        "https://vimeo.com/123456789/",
        "https://vimeo.com/123456789/abcd1234",
        "https://vimeo.com/987654321/Unlisted_Hash-1",
        "https://player.vimeo.com/video/123456789",
        "https://player.vimeo.com/video/123456789/",
        "https://player.vimeo.com/video/123456789?h=abcd1234",
        "https://player.vimeo.com/video/123456789?dnt=1&h=abcd1234",
        "https://player.vimeo.com/video/123456789?dnt=1",
        "https://vimeo.com/12345678901234567890",
        "HTTPS://WWW.VIMEO.COM/123456789/abc_DEF-123",
    )
    hostile_urls = (
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "//evil.example/video",
        "http://vimeo.com/123456789",
        "https://user:pass@vimeo.com/123456789",
        "https://vіmeo.com/123456789",
        "https://vimeo.com:443/123456789",
        "https://vimeo.com/not-a-number",
        "https://vimeo.com/123456789012345678901",
        "https://vimeo.com/123456789/bad.hash",
        "https://vimeo.com/123456789/" + "a" * 65,
        "https://vimeo.com/123456789/extra/path",
        "https://player.vimeo.com/video/123456789?evil=1",
        "https://player.vimeo.com/video/123456789?h=one&h=two",
        "https://player.vimeo.com/video/123456789?h=bad.hash",
        "https://vimeo.com/123456789#fragment",
        "https://player.vimeo.com/video/123456789/garbage",
    )

    def test_valid_corpus(self):
        for url in self.valid_urls:
            with self.subTest(url=url):
                reference = parse_vimeo(url)
                self.assertIsNotNone(reference)
                self.assertEqual(reference[0], "vimeo")
                self.assertEqual(reference[2], f"https://vimeo.com/{reference[1]}")

    def test_hostile_corpus(self):
        for url in self.hostile_urls:
            with self.subTest(url=url):
                self.assertIsNone(parse_vimeo(url))

    def test_unlisted_hash_survives_reference_and_embed_url(self):
        reference = parse_vimeo("https://vimeo.com/123456789/abcd1234")
        self.assertEqual(reference, ("vimeo", "123456789/abcd1234", "https://vimeo.com/123456789/abcd1234"))
        self.assertEqual(
            vimeo_embed_url(reference[1]),
            "https://player.vimeo.com/video/123456789?dnt=1&h=abcd1234",
        )


class ExternalReferenceTests(TestCase):
    valid_urls = (
        "https://cdn.example.com/video.mp4",
        "https://cdn.example.com/video.webm",
        "https://cdn.example.com/stream.m3u8",
        "https://media.example.org/path/lesson.MP4",
        "https://video.example.net/a-b_c.webm?token=opaque",
        "https://cdn.example.com/live.m3u8?sig=abc&expires=123",
        "HTTPS://CDN.EXAMPLE.COM/video.mp4",
        "https://edge-1.example.com/dir/lesson.mp4?download=1",
        "https://assets.example.co.uk/course/lesson.webm",
        "https://media.example.edu/video/part-01.M3U8",
        "https://origin.example.com/files/2026/lesson.mp4?x=1#".rstrip("#"),
        "https://cdn.example.com/video.mp4?redirect=https%3A%2F%2Fexample.com",
    )
    hostile_urls = (
        "javascript:alert(1)",
        "data:video/mp4;base64,AAAA",
        "//evil.example/video.mp4",
        "http://cdn.example.com/video.mp4",
        "https://user:pass@cdn.example.com/video.mp4",
        "https://cdn.exаmple.com/video.mp4",
        "https://localhost/video.mp4",
        "https://media.localhost/video.mp4",
        "https://127.0.0.1/video.mp4",
        "https://10.0.0.8/video.mp4",
        "https://8.8.8.8/video.mp4",
        "https://[::1]/video.mp4",
        "https://cdn.example.com/video.mov",
        "https://cdn.example.com/video.mp4/garbage",
        "https://cdn.example.com//video.mp4",
        "https://cdn.example.com/video.mp4#fragment",
        "https://cdn.example.com:443/video.mp4",
        "https://cdn.example.com/video.mp4" + "a" * 500,
    )

    def test_valid_corpus(self):
        for url in self.valid_urls:
            with self.subTest(url=url):
                reference = parse_external(url)
                self.assertIsNotNone(reference)
                self.assertEqual(reference[0], "external")
                self.assertEqual(reference[1], reference[2])
                self.assertTrue(reference[1].split("?", 1)[0].lower().endswith((".mp4", ".webm", ".m3u8")))

    def test_hostile_corpus(self):
        for url in self.hostile_urls:
            with self.subTest(url=url):
                self.assertIsNone(parse_external(url))
