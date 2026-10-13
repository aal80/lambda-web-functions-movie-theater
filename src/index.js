import express from 'express';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const FRAME_DELAY_MS = 50;
const FRAME_HEIGHT = 14; // 1 repeat-count line + 13 lines of art
const FRAMES_DIR = join(import.meta.dirname, 'frames');
const STATIC_DIR = join(import.meta.dirname, 'static');

// Lambda Web Functions sets AWS_LAMBDA_HTTP_ENDPOINT to the host:port the server must bind.
const [HOST, PORT] = (process.env.AWS_LAMBDA_HTTP_ENDPOINT || '127.0.0.1:3000').split(':');

// Each frame file is a sequence of 14-line blocks: a repeat count followed by the frame itself.
// A frame stays on screen for `repeat` ticks of FRAME_DELAY_MS.
function loadMovie(file) {
  const lines = readFileSync(join(FRAMES_DIR, file), 'utf8').split('\n');
  const frames = [];
  for (let i = 0; i + FRAME_HEIGHT <= lines.length; i += FRAME_HEIGHT) {
    frames.push({
      repeat: parseInt(lines[i], 10) || 1,
      text: lines.slice(i + 1, i + FRAME_HEIGHT).join('\n'),
    });
  }
  return frames;
}

const movies = new Map(
  readdirSync(FRAMES_DIR)
    .filter((f) => f.endsWith('.txt'))
    .map((f) => [f.slice(0, -4), loadMovie(f)])
);

// Hidden movies are still playable by URL, just not shown on the landing page.
const HIDDEN = new Set(['test']);
const listed = [...movies.keys()].filter((m) => !HIDDEN.has(m));

const isCurl = (req) => /^curl\//i.test(req.get('user-agent') || '');
const wantsSse = (req) => (req.get('accept') || '').includes('text/event-stream');

// Plays the movie, calling send(text) per frame. Stops early if the client disconnects.
async function play(frames, res, send) {
  const ac = new AbortController();
  res.on('close', () => ac.abort());
  try {
    for (const { repeat, text } of frames) {
      send(text);
      await sleep(FRAME_DELAY_MS * repeat, undefined, { signal: ac.signal });
    }
  } catch (err) {
    if (err.name !== 'AbortError') throw err;
  }
}

function streamPlain(frames, res) {
  res.set({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.flushHeaders();
  // ANSI: move cursor home and clear screen before each frame.
  return play(frames, res, (text) => res.write(`\x1b[H\x1b[2J${text}\n`));
}

async function streamSse(frames, res) {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  await play(frames, res, (text) => res.write(`data: ${JSON.stringify(text)}\n\n`));
  // Tell the browser to close the EventSource, otherwise it reconnects and replays the movie.
  res.write('event: end\ndata: \n\n');
}

const app = express();

app.use('/static', express.static(STATIC_DIR));

app.get('/', (req, res) => {
  if (isCurl(req)) {
    const host = req.get('host');
    // The local server speaks plain HTTP; the Lambda endpoint is HTTPS only.
    const scheme = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? 'http' : 'https';
    res.type('text/plain').send(`Movie Theater\n\n${listed.map((m) => `  curl -N ${scheme}://${host}/${m}`).join('\n')}\n`);
  } else {
    res.sendFile(join(STATIC_DIR, 'index.html'));
  }
});

app.get('/:movie', async (req, res) => {
  const frames = movies.get(req.params.movie);
  if (!frames) return res.status(404).type('text/plain').send(`No such movie: ${req.params.movie}\n`);

  if (wantsSse(req)) await streamSse(frames, res);
  else if (isCurl(req)) await streamPlain(frames, res);
  else return res.sendFile(join(STATIC_DIR, 'player.html'));
  res.end();
});

app.listen(PORT, HOST, () => {
  console.log(`Movie theater listening on ${HOST}:${PORT} with movies: ${[...movies.keys()].join(', ')}`);
});
