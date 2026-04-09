import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

mkdirSync('public/headtts/modules', { recursive: true });
mkdirSync('public/headtts/dictionaries', { recursive: true });

cpSync(
  'node_modules/@met4citizen/headtts/modules',
  'public/headtts/modules',
  { recursive: true }
);
cpSync(
  'node_modules/@met4citizen/headtts/dictionaries',
  'public/headtts/dictionaries',
  { recursive: true }
);

// Patch worker-tts.mjs: make updateTimestamps NaN/Infinity-safe.
//
// Root cause 1: vdurations[i] can equal phonemes.length (N), making
//   times[vdurations[i]+1] = times[N+1] = undefined → NaN.
// Root cause 2: ONNX model can produce NaN/Infinity frame counts, causing
//   times[] values to be NaN/Infinity, which propagates to vtimes/vdurations.
//   TalkingHead's playAudio then computes non-finite delay → AudioBufferSourceNode.start() throws.
//
// Fix: only guard against non-finite timestamps.
// Keep timing behavior close to upstream; if a timestamp is invalid, drop that
// segment by forcing zero duration instead of stretching visemes unnaturally.
const workerPath = 'public/headtts/modules/worker-tts.mjs';
let src = readFileSync(workerPath, 'utf8');

// Fix word timing (lines ~287-291)
src = src.replace(
  `    const start = times[o.wtimes[i]+1] + settings.deltaStart;
    const end = times[o.wdurations[i]+1] + settings.deltaEnd;
    const duration = end - start;
    o.wtimes[i] = start;
    o.wdurations[i] = duration;`,
  `    const _ws = times[o.wtimes[i]+1];
    const _we = times[o.wdurations[i]+1];
    const start = Number.isFinite(_ws) ? _ws + settings.deltaStart : 0;
    const end = Number.isFinite(_we) ? _we + settings.deltaEnd : start;
    const duration = Math.max(0, end - start);
    o.wtimes[i] = start;
    o.wdurations[i] = duration;`
);

// Fix viseme timing (lines ~297-301)
src = src.replace(
  `    const start = times[o.vtimes[i]+1] + settings.deltaStart;
    const end = times[o.vdurations[i]+1] + settings.deltaEnd;
    const duration = end - start;
    o.vtimes[i] = start;
    o.vdurations[i] = duration;`,
  `    const _vs = times[o.vtimes[i]+1];
    const _ve = times[o.vdurations[i]+1];
    const start = Number.isFinite(_vs) ? _vs + settings.deltaStart : 0;
    const end = Number.isFinite(_ve) ? _ve + settings.deltaEnd : start;
    const duration = Math.max(0, end - start);
    o.vtimes[i] = start;
    o.vdurations[i] = duration;`
);

// Verify both patches were applied
const wdOk = src.includes('isFinite(_ws)');
const vdOk = src.includes('isFinite(_vs)');
if (!wdOk || !vdOk) {
  console.error('ERROR: worker-tts.mjs patch did not apply! wdOk=' + wdOk + ' vdOk=' + vdOk);
  process.exit(1);
}

writeFileSync(workerPath, src, 'utf8');
console.log('HeadTTS static assets copied to public/headtts/ (with NaN-safe timing patch applied)');
