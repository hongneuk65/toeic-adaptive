# Listening pacing

The ETS paper-test sample script specifies five seconds after Part 1 and Part 2 answers, and normally eight seconds after each narrated Part 3/4 question. Some pauses in the sample are twelve seconds. This does not establish twelve seconds as a general rule for graphic questions. Page-turn prompts and directions are separate events; approximately 45 minutes is not a target to fill with silence.

Source: https://www.fr.ets.org/content/dam/ets-org/fr/pdfs/toeic/sample-test-listening-reading.pdf (script pages 26–31).

This app's library contains individual clips. At least the inspected Part 3 example contains the conversation only, without the three narrated questions. The app therefore schedules grouped response windows: normally 24 seconds for three Part 3/4 questions. A reviewed `stimulus.audioQuestionResponseSeconds: 12` can explicitly override an individual Part 3/4 response window. This approximates response time, not a complete ETS recording. Do not label it an exact official 45-minute track. Full fidelity requires reviewed narration/question timestamps, directions and page-turn metadata; never infer these from file duration or insert synthetic speech silently.

The `part-response-v1` plan counts a shared group recording once. It keeps playback at 1x and adds only the response window minus measured trailing silence. It does not trim files, remove pauses within speech, or stretch audio to reach a nominal section length. Missing duration returns the legacy fallback; missing silence metadata receives the whole response window. Invalid silence metadata is ignored. Inconsistent metadata within a shared group rejects the plan.

New FULL deadlines use measured Listening time plus 75 minutes Reading; MINI uses measured Listening plus 37.5 minutes Reading. Existing server deadlines remain authoritative. CUSTOM keeps the selected Reading-part budgets. A session's source snapshot also freezes its audio timing metadata; updating library metadata only affects new snapshots.

## Measure and provision private metadata

With PostgreSQL configured and `ffprobe`/`ffmpeg` installed:

```powershell
$env:EXAM_MEDIA_DIR = 'path/to/exam/media'
node backend/prisma/measure-exam-audio.cjs --report=private-timing-report.json
node backend/prisma/measure-exam-audio.cjs --apply
```

The default is a read-only dry run. The apply mode measures every referenced local file before updating metadata; updates use `updatedAt` and the audio URL as concurrency guards. Keep reports outside Git. Run against the intended database and rerun if a question changes during measurement. No seed/import is needed on an existing database.

The audit uses `silencedetect` at -45 dB for at least 100 ms. Only a silence interval ending at the end of the recording counts. This is an acoustic threshold, not speech recognition; preserve source recordings and inspect unusually long detected tails. Entirely silent clips fail the audit.

Tests cover per-Part windows, shared recordings, graphics, missing/corrupt timing, silence parsing, zero additional rest, and server-deadline precedence. Local acoustic audit reports stay in ignored storage.
