// 音频文件列表（来自 /bgm 目录）
const audioDir = 'bgm/';
const audioFilesRaw = [
  'b1.mp3',
  'b2.mp3',
  'b3.mp3',
  'b4.mp3',
  'b5.mp3',
  'b6.mp3',
  'b7.mp3',
  'c1.mp3',
  'c2.mp3',
  'c3.mp3',
  'c4.mp3',
  'c5.mp3',
  'c6.mp3',
  'c7.mp3',
  'd1.mp3'
];

const SLOTS = 15;
const audioFiles = Array.from(
  { length: SLOTS },
  (_, i) => audioFilesRaw[i % audioFilesRaw.length]
);
const keyMap = [
  '1',
  '2',
  '3',
  '4',
  '5',
  'Q',
  'W',
  'E',
  'R',
  'T',
  'A',
  'S',
  'D',
  'F',
  'G'
];

const pianoEl = document.getElementById('piano');

// WebAudio：并发播放更稳定
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContextClass();
const bufferCache = new Map();

async function loadBuffer(url) {
  if (bufferCache.has(url)) return bufferCache.get(url);
  const res = await fetch(url);
  const arr = await res.arrayBuffer();
  const buf = await audioCtx.decodeAudioData(arr);
  bufferCache.set(url, buf);
  return buf;
}
function playBufferAt(url, when) {
  const buf = bufferCache.get(url);
  if (!buf) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.connect(audioCtx.destination);
  src.start(when);
}
async function triggerPlay(url) {
  try {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
  } catch {}
  if (!bufferCache.has(url)) {
    try {
      await loadBuffer(url);
    } catch (e) {
      return;
    }
  }
  playBufferAt(url, audioCtx.currentTime);
}

// 创建面板波纹效果
function createRipple(event, keyElement) {
  const card = document.querySelector('.card');
  if (!card) return;

  const rect = card.getBoundingClientRect();
  const cardX = rect.left;
  const cardY = rect.top;
  const keyRect = keyElement.getBoundingClientRect();
  const x = keyRect.left - cardX + keyRect.width / 2;
  const y = keyRect.top - cardY + keyRect.height / 2;

  const ripple = document.createElement('div');
  ripple.className = 'ripple';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';

  card.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 1000);
}

function makeKey(index, key, file) {
  const btn = document.createElement('button');
  btn.className = 'key';
  btn.dataset.key = key;
  btn.dataset.src = audioDir + file;
  btn.innerHTML = `<div class="label">${key}</div>`;
  btn.title = file;

  const down = async (e) => {
    e.preventDefault();
    btn.classList.add('active');
    createRipple(e, btn);
    triggerPlay(btn.dataset.src);
  };
  const up = () => {
    btn.classList.remove('active');
  };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointerleave', up);
  btn.addEventListener('pointercancel', up);
  return btn;
}

for (let i = 0; i < SLOTS; i++) {
  const key = keyMap[i];
  const file = audioFiles[i];
  pianoEl.appendChild(makeKey(i, key, file));
}

// 键盘兼容（Edge/IME/布局），使用 e.code 优先
function getKeyFromEvent(e) {
  if (e.code && /^Digit[1-5]$/.test(e.code)) return e.code.replace('Digit', '');
  if (e.code && /^Key[QWERTASDFG]$/.test(e.code))
    return e.code.replace('Key', '');
  const k = e.key;
  if (typeof k === 'string' && k.length === 1) {
    const up = k.toUpperCase();
    if ('12345QWERTASDFG'.includes(up)) return up;
  }
  return null;
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const label = getKeyFromEvent(e);
  if (!label) return;
  const btn = Array.from(document.querySelectorAll('.key')).find(
    (b) => b.dataset.key === label
  );
  if (btn) {
    btn.classList.add('active');
    createRipple(e, btn);
    triggerPlay(btn.dataset.src);
    e.preventDefault();
  }
});
document.addEventListener('keyup', (e) => {
  const label = getKeyFromEvent(e);
  if (!label) return;
  const btn = Array.from(document.querySelectorAll('.key')).find(
    (b) => b.dataset.key === label
  );
  if (btn) {
    btn.classList.remove('active');
    e.preventDefault();
  }
});

// 缩放控制与自适应
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
let keySize =
  parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--key-size')
  ) || 44;
const minSize = 28,
  maxSize = 100,
  step = 4;
function applySizes() {
  document.documentElement.style.setProperty('--key-size', keySize + 'px');
  const gap = Math.max(8, Math.round(keySize / 4));
  document.documentElement.style.setProperty('--key-gap', gap + 'px');
}
function autoResize() {
  const vw = window.innerWidth;
  const padding =
    parseInt(getComputedStyle(document.body).paddingLeft) +
    parseInt(getComputedStyle(document.body).paddingRight);
  const usable = Math.max(320, Math.min(960, vw - padding));
  const gap = Math.max(8, Math.round(keySize / 4));
  let size = Math.floor((usable - gap * 4) / 5);
  size = Math.max(minSize, Math.min(maxSize, size));
  keySize = size;
  applySizes();
}
zoomInBtn.addEventListener('click', () => {
  keySize = Math.min(maxSize, keySize + step);
  applySizes();
});
zoomOutBtn.addEventListener('click', () => {
  keySize = Math.max(minSize, keySize - step);
  applySizes();
});
window.addEventListener('resize', autoResize);
window.addEventListener('orientationchange', autoResize);
autoResize();

// 全屏功能
const toggleFullscreenBtn = document.getElementById('toggleFullscreen');
const pianoContainer = document.querySelector('.card');

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    // 进入全屏
    if (pianoContainer.requestFullscreen) {
      pianoContainer.requestFullscreen();
    } else if (pianoContainer.webkitRequestFullscreen) {
      pianoContainer.webkitRequestFullscreen();
    } else if (pianoContainer.msRequestFullscreen) {
      pianoContainer.msRequestFullscreen();
    }
  } else {
    // 退出全屏
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

// 监听全屏状态变化
document.addEventListener('fullscreenchange', (e) => {
  if (document.fullscreenElement) {
    // 全屏模式下调整钢琴大小
    toggleFullscreenBtn.textContent = '退出全屏';
  } else {
    // 退出全屏
    toggleFullscreenBtn.textContent = '全屏';
  }
  // 重新调整按键大小
  autoResize();
});

// 监听webkit全屏变化
document.addEventListener('webkitfullscreenchange', (e) => {
  if (document.webkitFullscreenElement) {
    toggleFullscreenBtn.textContent = '退出全屏';
  } else {
    toggleFullscreenBtn.textContent = '全屏';
  }
  autoResize();
});

// 监听ms全屏变化
document.addEventListener('MSFullscreenChange', (e) => {
  if (document.msFullscreenElement) {
    toggleFullscreenBtn.textContent = '退出全屏';
  } else {
    toggleFullscreenBtn.textContent = '全屏';
  }
  autoResize();
});

// 添加全屏按钮事件监听
toggleFullscreenBtn.addEventListener('click', toggleFullscreen);

// 横屏与音频解锁
const overlay = document.getElementById('orientationOverlay');
const tryBtn = document.getElementById('tryLandscape');
const continueBtn = document.getElementById('continuePortrait');
function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
function shouldShowOverlay() {
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  return isMobile() && portrait;
}
async function tryLockLandscape() {
  try {
    if (
      document.documentElement.requestFullscreen &&
      !document.fullscreenElement
    ) {
      await document.documentElement.requestFullscreen();
    }
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock('landscape');
    }
  } catch (e) {}
}
function hideOverlay() {
  overlay.style.display = 'none';
}
function showOverlayIfNeeded() {
  overlay.style.display = shouldShowOverlay() ? 'flex' : 'none';
}
tryBtn.addEventListener('click', async () => {
  try {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
  } catch {}
  await tryLockLandscape();
  hideOverlay();
});
continueBtn.addEventListener('click', () => {
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {}
  hideOverlay();
});
window.addEventListener(
  'pointerdown',
  async () => {
    try {
      if (audioCtx.state === 'suspended') await audioCtx.resume();
    } catch {}
  },
  { once: true }
);
showOverlayIfNeeded();

// ========= 简谱文本与自动演奏 =========
const sheetText = document.getElementById('sheetText');
const parseOutput = document.getElementById('parseOutput');
const bpmInput = document.getElementById('bpm');
const beatMsEl = document.getElementById('beatMs');
const playSheetBtn = document.getElementById('playSheetBtn');
const parseOnlyBtn = document.getElementById('parseOnlyBtn');
const clearTextBtn = document.getElementById('clearTextBtn');

function updateBeatMs() {
  const bpm = Number(bpmInput.value || 90);
  beatMsEl.textContent = Math.round(60000 / bpm);
}
bpmInput.addEventListener('input', updateBeatMs);
updateBeatMs();

// 解析简谱：支持 1-7 音符、0 休止；. 为上下加点（前缀低音、后缀高音）；- 为延长一拍；*x 作为时值倍数（可小数）
function parseJianpu(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  const seq = [];
  let lastNote = null;
  for (let tok of tokens) {
    // 时值倍数字尾，如 5*1.5、3*2
    let durMul = 1;
    const dm = tok.match(/\*(\d+(?:\.\d+)?)$/);
    if (dm) {
      durMul = Number(dm[1]);
      tok = tok.replace(/\*(\d+(?:\.\d+)?)$/, '');
    }

    if (/^-+$/.test(tok)) {
      if (lastNote) lastNote.duration += tok.length;
      continue;
    }
    if (tok === '0') {
      seq.push({ type: 'rest', duration: durMul });
      lastNote = null;
      continue;
    }
    const base = tok; // 可能包含 . 作高低音标记
    const m = base.match(/^\.*([1-7])\.*$/);
    if (!m) continue;
    const digit = Number(m[1]);
    const low = base.startsWith('.');
    const high = base.endsWith('.') && !low;
    const octave = low ? 'b' : high ? 'd' : 'c';
    let url;
    if (octave === 'd') {
      url = digit === 1 ? `${audioDir}d1.mp3` : `${audioDir}c${digit}.mp3`;
    } else {
      url = `${audioDir}${octave}${digit}.mp3`;
    }
    const note = { type: 'note', url, digit, octave, duration: durMul };
    seq.push(note);
    lastNote = note;
  }
  return seq;
}

function formatSeq(seq) {
  return seq
    .map((x) =>
      x.type === 'rest'
        ? `休(${x.duration})`
        : `${x.octave}${x.digit}×${x.duration}`
    )
    .join(' | ');
}
async function preloadSeq(seq) {
  const urls = [
    ...new Set(seq.filter((x) => x.type === 'note').map((x) => x.url))
  ];
  await Promise.all(urls.map((u) => loadBuffer(u).catch(() => {})));
}
async function playSequence(seq, bpm) {
  try {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
  } catch {}
  const beat = 60 / bpm;
  let t = audioCtx.currentTime + 0.12;
  for (const item of seq) {
    if (item.type === 'rest') {
      t += item.duration * beat;
    } else {
      playBufferAt(item.url, t);
      t += item.duration * beat;
    }
  }
}

parseOnlyBtn.addEventListener('click', () => {
  const seq = parseJianpu(sheetText.value || '');
  parseOutput.textContent = '解析结果：' + formatSeq(seq);
});
clearTextBtn.addEventListener('click', () => {
  sheetText.value = '';
  parseOutput.textContent = '';
});
playSheetBtn.addEventListener('click', async () => {
  const text = sheetText.value || '';
  if (!text.trim()) {
    parseOutput.textContent = '请先输入或粘贴简谱文本。';
    return;
  }
  const bpm = Math.max(40, Math.min(200, Number(bpmInput.value || 90)));
  const seq = parseJianpu(text);
  parseOutput.textContent = '解析结果：' + formatSeq(seq) + `\nBPM: ${bpm}`;
  await preloadSeq(seq);
  await playSequence(seq, bpm);
});

// ========= 歌曲查询简谱（本地库） =========
const songQuery = document.getElementById('songQuery');
const searchSongBtn = document.getElementById('searchSongBtn');
const searchResults = document.getElementById('searchResults');
const playFoundBtn = document.getElementById('playFoundBtn');
const songJsonFile = document.getElementById('songJsonFile');
const loadSongJsonBtn = document.getElementById('loadSongJsonBtn');
const resetLibraryBtn = document.getElementById('resetLibraryBtn');

let songLibrary = [
  { title: '小星星', jianpu: '1 1 5 5 6 6 5*2 4 4 3 3 2 2 1*2' },
  {
    title: '生日快乐',
    jianpu:
      '5 5 6 5 1*2 7 5 5 6 5 2*2 1 5 5 5*1.5 3*0.5 1 7 6*2 4*1.5 4*0.5 3 1 2 1*2'
  },
  {
    title: '两只老虎',
    jianpu: '1 2 3 1*2 1 2 3 1*2 3 4 5*2 3 4 5*2 5 6 5 4 3 1*2 5 6 5 4 3 1*2'
  }
];
const defaultLibrary = JSON.parse(JSON.stringify(songLibrary));
let lastResults = [];
let selectedIdx = -1;

function normalize(s) {
  return s.toLowerCase();
}
function searchSongs(q) {
  q = normalize(q.trim());
  if (!q) return [];
  return songLibrary.filter((s) => normalize(s.title).includes(q));
}
function renderResults(items) {
  lastResults = items;
  selectedIdx = items.length ? 0 : -1;
  searchResults.innerHTML = items.length
    ? items
        .map(
          (s, i) =>
            `<button class="songTag" data-idx="${i}">${s.title}</button>`
        )
        .join('')
    : '<span style="color: var(--muted); font-size:12px">未找到匹配歌曲</span>';
  Array.from(searchResults.querySelectorAll('.songTag')).forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedIdx = Number(btn.dataset.idx);
      const item = lastResults[selectedIdx];
      sheetText.value = item.jianpu;
      parseOutput.textContent = `已选择：${item.title}`;
    });
  });
  if (items.length) {
    const item = items[0];
    sheetText.value = item.jianpu;
    parseOutput.textContent = `已选择：${item.title}`;
  }
}

searchSongBtn.addEventListener('click', () => {
  renderResults(searchSongs(songQuery.value));
});
songQuery.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    renderResults(searchSongs(songQuery.value));
  }
});

playFoundBtn.addEventListener('click', async () => {
  if (selectedIdx < 0 || !lastResults.length) {
    parseOutput.textContent = '请先搜索并选择歌曲。';
    return;
  }
  const item = lastResults[selectedIdx];
  const bpm = Math.max(40, Math.min(200, Number(bpmInput.value || 90)));
  const seq = parseJianpu(item.jianpu);
  parseOutput.textContent =
    `歌曲：${item.title}\n解析结果：` + formatSeq(seq) + `\nBPM: ${bpm}`;
  await preloadSeq(seq);
  await playSequence(seq, bpm);
});

loadSongJsonBtn.addEventListener('click', async () => {
  const f = songJsonFile.files && songJsonFile.files[0];
  if (!f) {
    parseOutput.textContent = '请选择 JSON 文件。';
    return;
  }
  try {
    const text = await f.text();
    const data = JSON.parse(text);
    let imported = [];
    if (Array.isArray(data)) {
      imported = data
        .filter((x) => x && x.title && x.jianpu)
        .map((x) => ({ title: String(x.title), jianpu: String(x.jianpu) }));
    } else if (data && typeof data === 'object') {
      imported = Object.keys(data).map((k) => ({
        title: String(k),
        jianpu: String(data[k])
      }));
    }
    if (!imported.length) {
      parseOutput.textContent = 'JSON 格式不正确或无有效数据。';
      return;
    }
    songLibrary = imported;
    parseOutput.textContent = `已加载歌曲数：${songLibrary.length}`;
    renderResults(searchSongs(songQuery.value || ''));
  } catch (e) {
    parseOutput.textContent = '加载失败：' + (e && e.message ? e.message : e);
  }
});
resetLibraryBtn.addEventListener('click', () => {
  songLibrary = JSON.parse(JSON.stringify(defaultLibrary));
  parseOutput.textContent = '已恢复默认歌曲库。';
  renderResults(searchSongs(songQuery.value || ''));
});
