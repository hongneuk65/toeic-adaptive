import { useEffect, useRef, useState } from 'react';
import { readListeningProgress, saveListeningProgress } from '../../lib/exam-listening';
import { restDeadline, restSecondsRemaining } from '../../lib/exam-pacing';

interface Props { attemptId: number; groupKey: string; src: string; onComplete: () => void; disabled?: boolean; restSeconds?: number }

/** A listening group is played once. Browser autoplay restrictions require a user gesture. */
export function ExamListeningAudio({ attemptId, groupKey, src, onComplete, disabled = false, restSeconds = 5 }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const completeRef = useRef(onComplete);
  const notifiedRef = useRef<string | null>(null);
  const startRef = useRef<() => void>(() => {});
  const [status, setStatus] = useState<'loading' | 'playing' | 'blocked' | 'error' | 'rest' | 'complete'>('loading');
  const [restRemaining, setRestRemaining] = useState(0);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || disabled) return;
    audio.disableRemotePlayback = true;
    let alive = true;
    let done = false;
    let ready = false;
    let position = readListeningProgress(attemptId, groupKey).position;
    let checkpointTime = performance.now();
    let checkpointPosition = position;
    let running = false;
    let resting = false;
    let restTimer: number | undefined;
    const persist = () => saveListeningProgress(attemptId, groupKey, { position, completed: done });
    const finish = () => {
      if (done || !alive) return;
      done = true;
      persist();
      setStatus('complete');
      const notificationKey = `${attemptId}:${groupKey}`;
      if (notifiedRef.current !== notificationKey) {
        notifiedRef.current = notificationKey;
        completeRef.current();
      }
    };
    // Only actual media progress counts. Buffering, blocked autoplay and closed tabs never consume audio.
    const checkpoint = () => {
      if (!ready || done || resting) return;
      const now = performance.now();
      const elapsed = running ? Math.max(0, (now - checkpointTime) / 1000) : 0;
      const maxExpected = checkpointPosition + elapsed + .4;
      if (audio.currentTime > maxExpected + .5 || audio.currentTime < position - .15) {
        audio.currentTime = position;
      } else {
        position = Math.max(position, audio.currentTime);
      }
      checkpointTime = now;
      checkpointPosition = position;
      persist();
    };
    const play = async () => {
      if (!alive || done || resting) return;
      try {
        await audio.play();
        if (alive && !done && !resting) setStatus('playing');
      } catch (error) {
        if (alive && !done && !resting) setStatus(error instanceof DOMException && error.name === 'NotAllowedError' ? 'blocked' : 'error');
      }
    };
    const metadata = () => {
      if (done || resting) return;
      audio.playbackRate = 1;
      audio.defaultPlaybackRate = 1;
      audio.currentTime = Math.min(position, Number.isFinite(audio.duration) ? audio.duration : position);
      ready = true;
      checkpointTime = performance.now();
      checkpointPosition = position;
      void play();
    };
    const playing = () => { if (resting || done) { audio.pause(); return; } running = true; checkpointTime = performance.now(); checkpointPosition = position; setStatus('playing'); };
    const stalled = () => { checkpoint(); running = false; };
    const rate = () => { if (audio.playbackRate !== 1) audio.playbackRate = 1; };
    const seeking = () => { if (ready && Math.abs(audio.currentTime - position) > .4) audio.currentTime = position; };
    const error = () => { if (resting || done) return; stalled(); setStatus('error'); };
    const startRest = () => {
      if (resting || done || !alive) return;
      resting = true;
      running = false;
      const saved = readListeningProgress(attemptId, groupKey);
      const deadline = restDeadline(saved.restDeadlineMs, restSeconds);
      saveListeningProgress(attemptId, groupKey, { position, completed: false, audioEnded: true, restDeadlineMs: deadline });
      const tick = () => {
        if (!alive) return;
        const remaining = restSecondsRemaining(deadline);
        setRestRemaining(remaining);
        if (remaining === 0) {
          if (restTimer !== undefined) window.clearInterval(restTimer);
          finish();
        } else setStatus('rest');
      };
      tick();
      if (!done) restTimer = window.setInterval(tick, 200);
    };
    const ended = () => { checkpoint(); position = Math.max(position, audio.currentTime); startRest(); };
    startRef.current = () => {
      if (audio.error) { ready = false; audio.load(); }
      else void play();
    };
    audio.addEventListener('loadedmetadata', metadata);
    audio.addEventListener('playing', playing);
    audio.addEventListener('timeupdate', checkpoint);
    audio.addEventListener('waiting', stalled);
    audio.addEventListener('pause', stalled);
    audio.addEventListener('ratechange', rate);
    audio.addEventListener('seeking', seeking);
    audio.addEventListener('error', error);
    audio.addEventListener('ended', ended);
    window.addEventListener('pagehide', checkpoint);
    const saved = readListeningProgress(attemptId, groupKey);
    if (saved.completed) finish();
    else if (saved.audioEnded) startRest();
    else if (audio.readyState >= 1) metadata();
    return () => {
      checkpoint();
      alive = false;
      if (restTimer !== undefined) window.clearInterval(restTimer);
      audio.removeEventListener('loadedmetadata', metadata);
      audio.removeEventListener('playing', playing);
      audio.removeEventListener('timeupdate', checkpoint);
      audio.removeEventListener('waiting', stalled);
      audio.removeEventListener('pause', stalled);
      audio.removeEventListener('ratechange', rate);
      audio.removeEventListener('seeking', seeking);
      audio.removeEventListener('error', error);
      audio.removeEventListener('ended', ended);
      window.removeEventListener('pagehide', checkpoint);
      audio.pause();
    };
  }, [attemptId, groupKey, src, disabled, restSeconds]);

  return <div className="exam-listening-status" role="status" aria-live="polite">
    <audio ref={audioRef} src={src} preload="auto" playsInline />
    {disabled ? <span>Phần nghe đã khóa.</span> : status === 'rest' ? <div className="exam-audio-rest"><span>Thời gian chọn đáp án</span><strong className="exam-audio-rest-count">{restRemaining}<small> giây</small></strong><span>Chuyển câu sau {restRemaining} giây</span></div> : status === 'blocked' ? <button type="button" onClick={() => startRef.current()}>Bắt đầu phần nghe</button>
      : status === 'error' ? <><span>Không tải được audio. Kiểm tra kết nối để tiếp tục từ vị trí đang nghe.</span> <button type="button" onClick={() => startRef.current()}>Kết nối lại audio</button></>
      : <span>{status === 'playing' ? 'Đang phát audio · Hết audio sẽ có thời gian chọn đáp án.' : status === 'complete' ? 'Đã nghe xong.' : 'Đang tải audio…'}</span>}
  </div>;
}
