const screen = document.getElementById('screen');

// Theme: dark by default; the choice is remembered across visits and pages.
const toggle = document.getElementById('theme-toggle');
const applyTheme = (light) => {
  document.body.classList.toggle('light', light);
  toggle.textContent = light ? '☾ Dark' : '☀ Light';
};
applyTheme(localStorage.getItem('theme') === 'light');
toggle.addEventListener('click', () => {
  const light = !document.body.classList.contains('light');
  localStorage.setItem('theme', light ? 'light' : 'dark');
  applyTheme(light);
});

// Landing page: show the real curl command for this site under each poster,
// preferring to wrap the line just before the movie path.
for (const el of document.querySelectorAll('.curl')) {
  el.replaceChildren(`curl -N ${location.origin}`, document.createElement('wbr'), `/${el.dataset.movie}`);
  el.title = 'Click to copy';
  el.addEventListener('click', async () => {
    await navigator.clipboard.writeText(el.textContent);
    el.classList.add('copied');
    setTimeout(() => el.classList.remove('copied'), 1200);
  });
}

// Player page: the same URL streams frames over SSE.
if (screen) {
  document.title = location.pathname.slice(1);
  const es = new EventSource(location.pathname);
  es.onmessage = (e) => { screen.textContent = JSON.parse(e.data); };
  // Close on end, otherwise EventSource reconnects and replays the movie.
  es.addEventListener('end', () => es.close());
}
