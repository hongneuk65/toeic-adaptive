const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execute = promisify(execFile);

function trailingSilence(log, duration) {
  let start = null, tail = 0;
  for (const line of log.split('\n')) {
    const begin = line.match(/silence_start: ([\d.]+)/);
    const end = line.match(/silence_end: ([\d.]+)/);
    if (begin) start = Number(begin[1]);
    if (end && start !== null) {
      if (Math.abs(duration - Number(end[1])) <= 0.06) tail = Number(end[1]) - start;
      start = null;
    }
  }
  if (start !== null) tail = duration - start;
  if (tail >= duration - 0.1) throw new Error('Audio contains no measurable speech');
  return Math.floor(Math.max(0, tail) * 1000) / 1000;
}

async function measureAudio(filename) {
  const { stdout } = await execute('ffprobe', ['-v','error','-show_entries','format=duration','-of','json',filename], { windowsHide:true, timeout:30000 });
  const duration = Number(JSON.parse(stdout).format?.duration);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Invalid audio duration');
  // Conservative threshold: do not classify quiet speech as a removable pause.
  const { stderr } = await execute('ffmpeg', ['-hide_banner','-nostats','-threads','1','-i',filename,'-af','silencedetect=noise=-45dB:d=0.1','-f','null','-'], { windowsHide:true,timeout:30000,maxBuffer:2e6 });
  return { audioDurationSeconds: Math.round(duration*1000)/1000, audioTrailingSilenceSeconds: trailingSilence(stderr,duration) };
}
module.exports = { trailingSilence, measureAudio };
