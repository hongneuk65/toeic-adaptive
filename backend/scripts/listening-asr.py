"""Local audio ASR. stdout is machine-readable JSON; never emits signed media URLs in errors."""
import argparse
import json
import os
import re
import sys
from urllib.parse import urlparse


class QuietLogger:
    def debug(self, message):
        pass

    def warning(self, message):
        pass

    def error(self, message):
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["prepare", "resolve", "transcribe"])
    parser.add_argument("--video")
    parser.add_argument("--audio")
    parser.add_argument("--model", required=True)
    parser.add_argument("--node")
    args = parser.parse_args()
    if args.command == "prepare":
        if all(os.path.isfile(os.path.join(args.model, name)) for name in ("model.bin", "config.json", "tokenizer.json")):
            print(json.dumps({"ready": True}))
            return
        from faster_whisper.utils import download_model
        download_model("base.en", output_dir=args.model)
        print(json.dumps({"ready": True}))
    elif args.command == "resolve":
        if not args.video or not re.fullmatch(r"[A-Za-z0-9_-]{11}", args.video):
            raise ValueError("INVALID_VIDEO")
        import yt_dlp
        options = {
            "quiet": True, "no_warnings": True, "logger": QuietLogger(),
            "noplaylist": True, "skip_download": True, "cachedir": False,
            "socket_timeout": 10, "retries": 0, "extractor_retries": 0,
            "format": "bestaudio[protocol=https][vcodec=none]",
            "js_runtimes": {"node": {"path": args.node}} if args.node else {},
        }
        with yt_dlp.YoutubeDL(options) as downloader:
            info = downloader.extract_info(f"https://www.youtube.com/watch?v={args.video}", download=False)
        if info.get("is_live") or info.get("live_status") in ("is_live", "is_upcoming"):
            raise ValueError("LIVE_UNSUPPORTED")
        parsed = urlparse(info.get("url", ""))
        if parsed.scheme != "https" or not (parsed.hostname or "").endswith(".googlevideo.com"):
            raise ValueError("INVALID_AUDIO_SOURCE")
        if not isinstance(info.get("duration"), (float, int)) or info["duration"] <= 0:
            raise ValueError("INVALID_DURATION")
        print(json.dumps({"url": info["url"], "duration": info["duration"]}))
    else:
        from faster_whisper import WhisperModel
        # Models are provisioned once, never downloaded during a user request.
        model = WhisperModel(args.model, device="cpu", compute_type="int8", cpu_threads=2, local_files_only=True)
        segments, _ = model.transcribe(args.audio, language="en", beam_size=3,
                                       vad_filter=True, condition_on_previous_text=False)
        cues = [{"start": s.start, "end": s.end, "text": s.text.strip()}
                for s in segments if s.text.strip() and s.no_speech_prob < 0.6]
        if not cues:
            raise ValueError("NO_SPEECH")
        print(json.dumps({"cues": cues}, ensure_ascii=False))


if __name__ == "__main__":
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    try:
        main()
    except Exception as error:
        # Provider errors can include signed URLs/proxy secrets: report stable codes only.
        known = str(error) if isinstance(error, ValueError) else ""
        code = known if known in ("INVALID_VIDEO", "LIVE_UNSUPPORTED", "INVALID_AUDIO_SOURCE", "INVALID_DURATION", "NO_SPEECH") else "AUDIO_UNAVAILABLE" if "yt_dlp" in type(error).__module__ else "ASR_FAILED"
        print(json.dumps({"error": code}))
        sys.exit(1)
