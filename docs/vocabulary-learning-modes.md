# Vocabulary learning and shared nature theme

The site uses one local WebP photograph and two low-opacity leaf shadow layers. Only transforms animate; motion pauses for hidden tabs, reduced-motion preferences and timed exam/placement routes. A persistent pause button is available outside focused tests. No external image host is needed.

Activity suggestions appear on library/selection pages only. Reading attempts, listening sessions, knowledge lessons/quizzes, clause exercises and vocabulary study do not mount the shared suggestion panel.

## Learning modes

- **Viết từ**: recall the English term from its meaning. The existing server-graded typed-recall event updates the memory schedule.
- **Trắc nghiệm**: choose from distinct words in the current folder. Exact duplicate meanings are excluded as distractors; fewer than two valid choices produces an explanatory state.
- **Nghe–gõ**: explicitly play browser speech synthesis, then type the term. The answer, meaning and IPA stay hidden until server grading. Browser synthesis is not represented as a human recording.
- **Luyện nói**: record and replay locally, listen to a model term/example, then optionally submit a manually entered sentence for AI feedback about grammar and target-word usage. Audio is not uploaded. This does not perform automated phonetic/pronunciation scoring.

Quiz/dictation use POST /flashcards/cards/:id/practice with an immutable UUID, mode, response and elapsed time. Server access checks and normalization determine correctness. Results are stored separately in LearningAttempt (VOCAB_QUIZ / VOCAB_DICTATION); these different tasks do not train or overwrite typed-recall HLR curves. Retries preserve the original payload. Feedback remains visible until explicit continuation, and navigation/time-based due filtering pause while the attempt awaits confirmation or acknowledgment.

AI sentence feedback uses POST /vocabulary/practice-feedback with cardId and response. The server loads the authorized card, blocks unfinished exams, rate limits requests and validates provider output. It returns pronunciationAssessed:false. Missing providers or invalid output return a clear unavailable response, without fabricated feedback. Existing backend GEMINI_API_KEY or OPENAI_API_KEY configuration is required for live generation; keys stay server-side.

## Verification

Browser fixtures cover quiz retries, duplicate-meaning options, time-based pending races, answer hiding, spoken-sentence feedback errors, explicit continuation, motion preference persistence and reduced-motion/exam behavior. Real local database smoke checks cover server grading, single-record retry behavior and unchanged typed-recall state. Browser AI/TTS responses are mocked; real provider quality and device microphone behavior require separate verification.
