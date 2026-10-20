# HLS Packaging <- Ingest Command
# Turns one source file into AES-128 encrypted HLS renditions with FFmpeg:
# a single decode split into 360p/480p/720p, one unique key per rendition,
# and playlists that carry __TOKEN__ placeholders (never a usable URL at rest).
import secrets
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

# The fixed rendition ladder — one decode, three outputs, per-rendition keys.
RENDITIONS = (
    {"quality": "360p", "height": 360, "video_bitrate_kbps": 600, "audio_bitrate_kbps": 96},
    {"quality": "480p", "height": 480, "video_bitrate_kbps": 1000, "audio_bitrate_kbps": 128},
    {"quality": "720p", "height": 720, "video_bitrate_kbps": 2500, "audio_bitrate_kbps": 128},
)
SEGMENT_SECONDS = 6


class PackagingError(RuntimeError):
    """FFmpeg is missing or refused the source — surfaced as video status=error."""


@dataclass
class PackagedRendition:
    """One rendition's outputs, ready to upload to Telegram."""

    quality: str
    width: int
    height: int
    bandwidth_bps: int
    playlist_text: str
    aes_key_hex: str
    segments: list[Path]


@dataclass
class PackagingResult:
    master_playlist: str
    duration_seconds: int
    renditions: list[PackagedRendition]
    # The caller must delete this after uploading — it holds the segment files.
    work_dir: Path


def ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def _run(command: list[str]) -> None:
    proc = subprocess.run(command, capture_output=True, text=True)
    if proc.returncode != 0:
        raise PackagingError(f"FFmpeg failed: {proc.stderr[-2000:]}")


def probe_duration(source: Path) -> int:
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(source)],
        capture_output=True,
        text=True,
    )
    try:
        return int(float(proc.stdout.strip()))
    except ValueError as exc:
        raise PackagingError(f"ffprobe could not read the source duration: {proc.stderr[-500:]}") from exc


def _pack_rendition(source: Path, work_dir: Path, spec: dict, duration_seconds: int) -> PackagedRendition:
    """Encode + encrypt one quality: unique 16-byte key, VOD playlist, 6s segments."""
    quality = spec["quality"]
    out_dir = work_dir / quality
    out_dir.mkdir(parents=True, exist_ok=True)
    # FFmpeg reads the key file as raw bytes (never hex-decodes it), so the file
    # must hold exactly the 16 key bytes the player will fetch from the API.
    key_bytes = secrets.token_bytes(16)
    key_file = work_dir / f"{quality}.key"
    key_file.write_bytes(key_bytes)

    # The key URI points at the gated backend endpoint; __TOKEN__ is injected at serve time.
    key_info = work_dir / f"{quality}.keyinfo"
    key_info.write_text(f"/api/stream/__TOKEN__/key/{quality}\n{key_file}\n")

    playlist_path = out_dir / "index.m3u8"
    _run([
        "ffmpeg", "-y", "-i", str(source),
        "-vf", f"scale=-2:{spec['height']}",
        "-c:v", "libx264", "-preset", "veryfast", "-b:v", f"{spec['video_bitrate_kbps']}k",
        "-c:a", "aac", "-b:a", f"{spec['audio_bitrate_kbps']}k",
        "-f", "hls", "-hls_time", str(SEGMENT_SECONDS),
        "-hls_playlist_type", "vod", "-hls_flags", "independent_segments",
        "-hls_key_info_file", str(key_info),
        "-hls_segment_filename", str(out_dir / "seg_%05d.ts"),
        str(playlist_path),
    ])

    playlist_text = playlist_path.read_text()
    segments = sorted(out_dir.glob("seg_*.ts"))
    # Bandwidth = total bits of this rendition over its duration (what players ladder on).
    total_bits = sum(segment.stat().st_size * 8 for segment in segments)
    bandwidth = int(total_bits / duration_seconds) if duration_seconds else spec["video_bitrate_kbps"] * 1000
    # Resolution comes from a probe — the media playlist has no RESOLUTION attribute.
    width = _probe_width_height(source, spec["height"])[0]
    return PackagedRendition(
        quality=quality,
        width=width,
        height=spec["height"],
        bandwidth_bps=bandwidth,
        playlist_text=playlist_text,
        aes_key_hex=key_bytes.hex(),
        segments=segments,
    )


def _probe_width_height(source: Path, target_height: int) -> tuple[int, int]:
    """Even-width resolution the scale filter will produce for a target height."""
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(source)],
        capture_output=True,
        text=True,
    )
    try:
        width, height = (int(part) for part in proc.stdout.strip().split(",")[:2])
        scaled_width = int(width * target_height / height / 2) * 2  # x264 needs even widths
        return scaled_width, target_height
    except (ValueError, ZeroDivisionError):
        return 640 * target_height // 360, target_height


def _master_playlist(renditions: list[PackagedRendition]) -> str:
    """A standard master playlist with the token placeholder in every variant URI."""
    lines = ["#EXTM3U", "#EXT-X-VERSION:3"]
    for rendition in sorted(renditions, key=lambda item: item.bandwidth_bps):
        lines.append(f"#EXT-X-STREAM-INF:BANDWIDTH={rendition.bandwidth_bps},RESOLUTION={rendition.width}x{rendition.height}")
        lines.append(f"/api/stream/__TOKEN__/{rendition.quality}/index.m3u8")
    return "\n".join(lines) + "\n"


def package_video(source_path: str) -> PackagingResult:
    """Package one source into the full encrypted HLS tree (caller owns the temp dir flow).

    Each rendition gets its own AES-128 key, so one stolen rendition key never
    decrypts another quality, and the stored playlists contain no working URL —
    only __TOKEN__ placeholders that the serving layer rewrites per request.
    """
    if not ffmpeg_available():
        raise PackagingError("ffmpeg/ffprobe not found on PATH — install FFmpeg to ingest videos")

    source = Path(source_path)
    if not source.is_file():
        raise PackagingError(f"Source file not found: {source}")

    duration = probe_duration(source)
    work_dir = Path(tempfile.mkdtemp(prefix="khawarizm_hls_"))
    try:
        renditions = [_pack_rendition(source, work_dir, spec, duration) for spec in RENDITIONS]
        return PackagingResult(
            master_playlist=_master_playlist(renditions),
            duration_seconds=duration,
            renditions=renditions,
            work_dir=work_dir,
        )
    except Exception:
        shutil.rmtree(work_dir, ignore_errors=True)  # failed packaging leaves no temp litter
        raise
