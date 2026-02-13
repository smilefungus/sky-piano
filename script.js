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
// 三种显示模式的映射
const keyMaps = {
  // 键盘按键模式
  keyboard: [
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
  ],
  // 音名模式
  note: [
    'B1',
    'B2',
    'B3',
    'B4',
    'B5',
    'B6',
    'B7',
    'C1',
    'C2',
    'C3',
    'C4',
    'C5',
    'C6',
    'C7',
    'D1'
  ],
  sheet: [
    '①',
    '②',
    '③',
    '④',
    '⑤',
    '⑥',
    '⑦',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '❶',
    '❷',
    '❸',
    '❹',
    '❺',
    '❻',
    '❼'
  ]
};

// 当前显示模式，默认为简谱模式
let currentMode = 'sheet';

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
  btn.dataset.index = index;
  btn.dataset.src = audioDir + file;
  btn.innerHTML = `<div class="label">${keyMaps[currentMode][index]}</div>`;

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
  const key = keyMaps.keyboard[i];
  const file = audioFiles[i];
  pianoEl.appendChild(makeKey(i, key, file));
}

// 更新按键显示模式的函数
function updateKeyDisplay(mode) {
  currentMode = mode;
  const keys = document.querySelectorAll('.key');
  keys.forEach((key, index) => {
    const label = key.querySelector('.label');
    if (label) {
      label.textContent = keyMaps[mode][index];
    }
  });
}

// 模式循环切换按钮事件监听
const toggleKeyModeBtn = document.getElementById('toggleKeyMode');
const modeCycle = ['sheet', 'keyboard', 'note'];
const modeNames = { sheet: '简谱', keyboard: '键盘', note: '音名' };

// 当前模式索引
let currentModeIndex = 0;

// 初始设置为简谱模式
updateKeyDisplay(modeCycle[currentModeIndex]);
toggleKeyModeBtn.textContent = modeNames[modeCycle[currentModeIndex]];

toggleKeyModeBtn.addEventListener('click', () => {
  // 循环切换模式
  currentModeIndex = (currentModeIndex + 1) % modeCycle.length;
  const newMode = modeCycle[currentModeIndex];
  updateKeyDisplay(newMode);
  toggleKeyModeBtn.textContent = modeNames[newMode];
});

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
  let dimension = window.innerWidth;
  const padding =
    parseInt(getComputedStyle(document.body).paddingLeft) +
    parseInt(getComputedStyle(document.body).paddingRight);

  // 检测是否为全屏且是移动设备
  const isFullscreen =
    !!document.fullscreenElement ||
    !!document.webkitFullscreenElement ||
    !!document.mozFullScreenElement ||
    !!document.msFullscreenElement;
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // 在移动设备全屏模式下，使用高度来计算（因为会旋转90度）
  if (isFullscreen && isMobile) {
    dimension = window.innerHeight;
  }

  let usable;
  if (isMobile && !isFullscreen) {
    // 移动设备非全屏模式，增加额外边距防止超出边框
    const extraMargin = 20; // 额外边距
    usable = Math.max(
      280,
      Math.min(720, dimension - padding - extraMargin * 2)
    );
  } else {
    usable = Math.max(320, Math.min(960, dimension - padding));
  }

  const gap = Math.max(8, Math.round(keySize / 4));
  let size = Math.floor((usable - gap * 4) / 5);

  // 为移动设备设置更小的最大琴键尺寸
  const maxSizeForMobile = 80;
  if (isMobile && !isFullscreen) {
    size = Math.max(minSize, Math.min(maxSizeForMobile, size));
  } else {
    size = Math.max(minSize, Math.min(maxSize, size));
  }

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
autoResize();

// 全屏功能
const toggleFullscreenBtn = document.getElementById('toggleFullscreen');
const pianoContainer = document.querySelector('.card');

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    // 进入全屏 - 处理浏览器兼容性
    // 检查不同浏览器支持的全屏API方法
    if (pianoContainer.requestFullscreen) {
      // 标准全屏API
      pianoContainer.requestFullscreen();
    } else if (pianoContainer.webkitRequestFullscreen) {
      // WebKit浏览器（Chrome/Safari）全屏API
      pianoContainer.webkitRequestFullscreen();
    } else if (pianoContainer.msRequestFullscreen) {
      // Microsoft浏览器（Edge/IE11）全屏API
      pianoContainer.msRequestFullscreen();
    }
  } else {
    // 退出全屏 - 处理浏览器兼容性
    // 检查不同浏览器支持的退出全屏API方法
    if (document.exitFullscreen) {
      // 标准退出全屏API
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      // WebKit浏览器（Chrome/Safari）退出全屏API
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      // Microsoft浏览器（Edge/IE11）退出全屏API
      document.msExitFullscreen();
    }
  }
}

// 处理全屏状态变化的通用函数
function handleFullscreenChange() {
  const isFullscreen =
    !!document.fullscreenElement ||
    !!document.webkitFullscreenElement ||
    !!document.mozFullScreenElement ||
    !!document.msFullscreenElement;
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const piano = document.querySelector('.piano');
  const card = document.querySelector('.card');

  // 使用setTimeout确保全屏状态稳定后再应用样式
  setTimeout(() => {
    if (isFullscreen) {
      toggleFullscreenBtn.textContent = '退出全屏';

      // 在移动设备上直接设置旋转样式
      if (isMobile) {
        // 设置body和html样式
        document.body.style.overflow = 'hidden';

        // 设置card容器样式
        card.style.display = 'flex';
        card.style.alignItems = 'center';
        card.style.justifyContent = 'center';
        card.style.height = '100vh';
        card.style.width = '100vw';
        card.style.padding = '20px';
        card.style.boxSizing = 'border-box';
        card.style.overflow = 'hidden';

        // 获取屏幕尺寸用于计算
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // 设置钢琴旋转和尺寸
        piano.style.transform = 'rotate(90deg)';
        piano.style.transformOrigin = 'center center';
        piano.style.maxWidth = `${screenHeight - 40}px`;
        piano.style.maxHeight = `${screenWidth - 40}px`;
        piano.style.width = 'auto';
        piano.style.height = 'auto';
        piano.style.margin = 'auto';
      } else {
        // 桌面端全屏样式
        document.body.style.overflow = 'hidden';

        card.style.display = 'flex';
        card.style.alignItems = 'center';
        card.style.justifyContent = 'center';
        card.style.height = '100vh';
        card.style.width = '100vw';
        card.style.padding = '20px';
        card.style.boxSizing = 'border-box';
      }
    } else {
      toggleFullscreenBtn.textContent = '全屏';

      // 恢复原始样式
      document.body.style.overflow = '';

      card.style.display = '';
      card.style.alignItems = '';
      card.style.justifyContent = '';
      card.style.height = '';
      card.style.width = '';
      card.style.padding = '';
      card.style.boxSizing = '';
      card.style.overflow = '';

      piano.style.transform = '';
      piano.style.transformOrigin = '';
      piano.style.maxWidth = '';
      piano.style.maxHeight = '';
      piano.style.width = '';
      piano.style.height = '';
      piano.style.margin = '';
    }

    // 重新调整按键大小
    autoResize();
  }, 100);
}

// 监听全屏状态变化
document.addEventListener('fullscreenchange', handleFullscreenChange);

// 监听webkit全屏变化
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

// 监听ms全屏变化
document.addEventListener('MSFullscreenChange', handleFullscreenChange);

// 添加全屏按钮事件监听
toggleFullscreenBtn.addEventListener('click', toggleFullscreen);

// 音频解锁
window.addEventListener(
  'pointerdown',
  async () => {
    try {
      if (audioCtx.state === 'suspended') await audioCtx.resume();
    } catch {}
  },
  { once: true }
);

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
