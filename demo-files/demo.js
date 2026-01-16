// Import library and expose globally for tests
import * as Library from '../dist/index.js'
window.Library = Library

// Create wiki instance
const { createWiki } = Library;

// ============================================
// INITIAL DATA
// ============================================

const initialPages = [
  {
    id: 'kingdom-of-valdoria',
    title: 'Kingdom of Valdoria',
    type: 'location',
    tags: ['kingdom', 'main-setting'],
    content: 'A prosperous realm ruled by [[King Aldric]]. Notable places include [[Crystal Spire]] and [[Shadow Forest]].',
    created: new Date('2024-01-01'),
    modified: new Date('2024-01-01')
  },
  {
    id: 'king-aldric',
    title: 'King Aldric',
    type: 'character',
    tags: ['royalty', 'protagonist'],
    content: 'The wise ruler of [[Kingdom of Valdoria]]. Father of [[Princess Elena]]. Wields the legendary [[Sunblade]].',
    created: new Date('2024-01-02'),
    modified: new Date('2024-01-02')
  },
  {
    id: 'princess-elena',
    title: 'Princess Elena',
    type: 'character',
    tags: ['royalty', 'protagonist'],
    content: 'Heir to [[Kingdom of Valdoria]]. Trained in magic at the [[Crystal Spire]]. Seeks the [[Lost Artifact]].',
    created: new Date('2024-01-03'),
    modified: new Date('2024-01-03')
  },
  {
    id: 'crystal-spire',
    title: 'Crystal Spire',
    type: 'location',
    tags: ['magical', 'landmark'],
    content: 'Ancient tower of magic in [[Kingdom of Valdoria]]. Home to the order of mages.',
    created: new Date('2024-01-04'),
    modified: new Date('2024-01-04')
  },
  {
    id: 'shadow-forest',
    title: 'Shadow Forest',
    type: 'location',
    tags: ['dangerous', 'wilderness'],
    content: 'Dark woods on the border of [[Kingdom of Valdoria]]. Rumored home of [[The Dark One]].',
    created: new Date('2024-01-05'),
    modified: new Date('2024-01-05')
  },
  {
    id: 'sunblade',
    title: 'Sunblade',
    type: 'item',
    tags: ['legendary', 'weapon', 'magical'],
    content: 'Legendary sword wielded by [[King Aldric]]. Said to banish darkness.',
    created: new Date('2024-01-06'),
    modified: new Date('2024-01-06')
  }
];

// ============================================
// GLOBAL STATE
// ============================================

let wiki = createWiki();
let cardPositions = new Map();
let selectedCardId = null;
let graphSelectedNode = null;

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================
// EXHIBIT 1: LIVING WIKI
// ============================================

const wikiCanvas = document.getElementById('wiki-canvas');
const wikiSvg = document.getElementById('wiki-connections');
const wikiEditor = document.getElementById('wiki-editor');
const wikiEditorTitle = document.getElementById('wiki-editor-title');
const wikiEditorContent = document.getElementById('wiki-editor-content');

const typeIcons = {
  character: '\u{1F464}',
  location: '\u{1F4CD}',
  item: '\u2694\uFE0F',
  event: '\u{1F4C5}',
  default: '\u{1F4C4}'
};

function getTypeIcon(type) {
  return typeIcons[type] || typeIcons.default;
}

function initializeCardPositions() {
  cardPositions.clear();
  const pages = wiki.listPages();
  const deadLinks = wiki.getDeadLinks();
  const deadTargets = new Set(deadLinks.map(d => d.target));

  // Layout existing pages in a grid
  const cols = 3;
  const startX = 40;
  const startY = 30;
  const gapX = 180;
  const gapY = 120;

  pages.forEach((page, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    cardPositions.set(page.id, {
      x: startX + col * gapX,
      y: startY + row * gapY,
      isGhost: false
    });
  });

  // Add ghost cards for dead links
  let ghostIndex = 0;
  deadTargets.forEach(target => {
    const ghostId = `ghost-${target.toLowerCase().replace(/\s+/g, '-')}`;
    cardPositions.set(ghostId, {
      x: startX + (pages.length % cols + ghostIndex) * gapX,
      y: startY + Math.floor((pages.length + ghostIndex) / cols) * gapY,
      isGhost: true,
      title: target
    });
    ghostIndex++;
  });
}

function renderWikiCards() {
  // Remove existing cards
  wikiCanvas.querySelectorAll('.wiki-card').forEach(el => el.remove());

  const pages = wiki.listPages();
  const deadLinks = wiki.getDeadLinks();
  const deadTargets = new Set(deadLinks.map(d => d.target));
  const orphans = new Set(wiki.getOrphans().map(p => p.id));

  // Render page cards
  pages.forEach(page => {
    const pos = cardPositions.get(page.id);
    if (!pos) return;

    const card = document.createElement('div');
    card.className = 'wiki-card';
    if (orphans.has(page.id)) card.classList.add('orphan');
    if (selectedCardId === page.id) card.classList.add('selected');
    card.dataset.id = page.id;
    card.style.left = `${pos.x}px`;
    card.style.top = `${pos.y}px`;

    card.innerHTML = `
      <div class="wiki-card-title">${escapeHtml(page.title)}</div>
      <div class="wiki-card-type"><span class="type-icon">${getTypeIcon(page.type)}</span>${page.type || 'untyped'}</div>
    `;

    card.addEventListener('mousedown', startDrag);
    card.addEventListener('click', (e) => {
      if (!card.classList.contains('dragging')) selectCard(page.id);
    });

    wikiCanvas.appendChild(card);
  });

  // Render ghost cards
  deadTargets.forEach(target => {
    const ghostId = `ghost-${target.toLowerCase().replace(/\s+/g, '-')}`;
    const pos = cardPositions.get(ghostId);
    if (!pos) return;

    const card = document.createElement('div');
    card.className = 'wiki-card ghost';
    card.dataset.ghostTitle = target;
    card.style.left = `${pos.x}px`;
    card.style.top = `${pos.y}px`;

    card.innerHTML = `
      <div class="wiki-card-title">${escapeHtml(target)}</div>
      <div class="wiki-card-type">dead link</div>
    `;

    card.addEventListener('mousedown', startDrag);
    card.addEventListener('click', () => createFromGhost(target));

    wikiCanvas.appendChild(card);
  });

  renderConnections();
}

function renderConnections() {
  wikiSvg.innerHTML = '';

  const pages = wiki.listPages();
  const graph = wiki.getGraph();
  const deadLinks = wiki.getDeadLinks();

  // Draw connections between existing pages
  for (const page of pages) {
    const sourcePos = cardPositions.get(page.id);
    if (!sourcePos) continue;

    const links = graph[page.id] || [];
    for (const targetId of links) {
      const targetPos = cardPositions.get(targetId);
      if (targetPos && !targetPos.isGhost) {
        const line = createConnectionLine(sourcePos, targetPos, page.id === selectedCardId);
        wikiSvg.appendChild(line);
      }
    }
  }

  // Draw dead link connections
  for (const dead of deadLinks) {
    const sourcePos = cardPositions.get(dead.source);
    const ghostId = `ghost-${dead.target.toLowerCase().replace(/\s+/g, '-')}`;
    const targetPos = cardPositions.get(ghostId);
    if (sourcePos && targetPos) {
      const line = createConnectionLine(sourcePos, targetPos, dead.source === selectedCardId, true);
      wikiSvg.appendChild(line);
    }
  }

  // Draw incoming connections (backlinks) for selected card
  if (selectedCardId) {
    const backlinks = wiki.getBacklinks(selectedCardId);
    for (const sourceId of backlinks) {
      const sourcePos = cardPositions.get(sourceId);
      const targetPos = cardPositions.get(selectedCardId);
      if (sourcePos && targetPos) {
        const line = createConnectionLine(sourcePos, targetPos, false, false, true);
        wikiSvg.appendChild(line);
      }
    }
  }
}

function createConnectionLine(from, to, highlight = false, isDead = false, isIncoming = false) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const cardWidth = 140;
  const cardHeight = 60;

  const fromX = from.x + cardWidth / 2;
  const fromY = from.y + cardHeight / 2;
  const toX = to.x + cardWidth / 2;
  const toY = to.y + cardHeight / 2;

  // Curved path
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const offset = Math.min(30, Math.sqrt(dx*dx + dy*dy) / 4);
  const ctrlX = midX - dy * 0.2;
  const ctrlY = midY + dx * 0.2;

  line.setAttribute('d', `M ${fromX} ${fromY} Q ${ctrlX} ${ctrlY} ${toX} ${toY}`);
  line.classList.add('connection-line');
  if (highlight) line.classList.add('highlight');
  if (isDead) line.classList.add('dead');
  if (isIncoming) line.classList.add('incoming');

  return line;
}

let dragState = null;

function startDrag(e) {
  if (e.button !== 0) return;
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const canvasRect = wikiCanvas.getBoundingClientRect();

  dragState = {
    card,
    id: card.dataset.id || card.dataset.ghostTitle,
    isGhost: card.classList.contains('ghost'),
    startX: e.clientX,
    startY: e.clientY,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    canvasX: canvasRect.left,
    canvasY: canvasRect.top,
    moved: false
  };

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', endDrag);
}

function onDrag(e) {
  if (!dragState) return;

  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;

  if (!dragState.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
    dragState.moved = true;
    dragState.card.classList.add('dragging');
  }

  if (dragState.moved) {
    const x = e.clientX - dragState.canvasX - dragState.offsetX;
    const y = e.clientY - dragState.canvasY - dragState.offsetY;
    dragState.card.style.left = `${x}px`;
    dragState.card.style.top = `${y}px`;

    const key = dragState.isGhost ? `ghost-${dragState.id.toLowerCase().replace(/\s+/g, '-')}` : dragState.id;
    const pos = cardPositions.get(key);
    if (pos) {
      pos.x = x;
      pos.y = y;
    }

    renderConnections();
  }
}

function endDrag() {
  if (dragState) {
    dragState.card.classList.remove('dragging');
    dragState = null;
  }
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', endDrag);
}

function selectCard(id) {
  selectedCardId = id;
  const page = wiki.getPage(id);
  if (page) {
    wikiEditorTitle.value = page.title;
    wikiEditorContent.value = page.content;
    wikiEditor.classList.add('visible');
  }
  renderWikiCards();
}

async function createFromGhost(title) {
  const page = await wiki.createPage({ title, content: '' });
  const ghostId = `ghost-${title.toLowerCase().replace(/\s+/g, '-')}`;
  const ghostPos = cardPositions.get(ghostId);
  if (ghostPos) {
    cardPositions.set(page.id, { x: ghostPos.x, y: ghostPos.y, isGhost: false });
    cardPositions.delete(ghostId);
  }
  selectCard(page.id);
  renderWikiCards();
}

// ============================================
// EXHIBIT 2: GRAPH EXPLORER
// ============================================

const graphSvg = document.getElementById('graph-svg');
const depthSlider = document.getElementById('depth-slider');
const depthValue = document.getElementById('depth-value');
const selectedNodeSpan = document.getElementById('selected-node');
const connectedCountSpan = document.getElementById('connected-count');

let graphNodes = [];
let graphEdges = [];
let graphSimulation = null;

function initializeGraph() {
  const pages = wiki.listPages();
  const graph = wiki.getGraph();

  graphNodes = pages.map(page => ({
    id: page.id,
    title: page.title,
    type: page.type,
    x: Math.random() * 500 + 50,
    y: Math.random() * 300 + 50,
    vx: 0,
    vy: 0
  }));

  graphEdges = [];
  for (const page of pages) {
    const targets = graph[page.id] || [];
    for (const targetId of targets) {
      if (pages.find(p => p.id === targetId)) {
        graphEdges.push({ source: page.id, target: targetId });
      }
    }
  }

  graphSelectedNode = 'kingdom-of-valdoria';
}

function renderGraphExplorer() {
  initializeGraph();

  graphSvg.innerHTML = '';
  const width = graphSvg.clientWidth || 600;
  const height = 400;

  // Create edges
  const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  edgeGroup.id = 'edges';
  graphSvg.appendChild(edgeGroup);

  for (const edge of graphEdges) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('graph-edge');
    line.dataset.source = edge.source;
    line.dataset.target = edge.target;
    edgeGroup.appendChild(line);
  }

  // Create nodes
  const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  nodeGroup.id = 'nodes';
  graphSvg.appendChild(nodeGroup);

  for (const node of graphNodes) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('graph-node');
    g.dataset.id = node.id;
    if (node.id === graphSelectedNode) g.classList.add('selected');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', 20);
    circle.setAttribute('fill', getNodeColor(node.type));
    g.appendChild(circle);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('dy', 35);
    text.textContent = node.title.length > 12 ? node.title.slice(0, 10) + '...' : node.title;
    g.appendChild(text);

    g.addEventListener('click', () => {
      graphSelectedNode = node.id;
      updateGraphSelection();
    });

    g.addEventListener('mousedown', startGraphDrag);

    nodeGroup.appendChild(g);
  }

  startGraphSimulation();
  updateGraphSelection();
}

function getNodeColor(type) {
  const colors = {
    character: '#58a6ff',
    location: '#3fb950',
    item: '#d29922',
    event: '#8957e5'
  };
  return colors[type] || '#8b949e';
}

function startGraphSimulation() {
  if (graphSimulation) cancelAnimationFrame(graphSimulation);

  const width = graphSvg.clientWidth || 600;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;

  let iteration = 0;
  const maxIterations = 200;

  function simulate() {
    // Apply forces
    for (const node of graphNodes) {
      node.vx *= 0.9;
      node.vy *= 0.9;

      // Center gravity
      node.vx += (centerX - node.x) * 0.001;
      node.vy += (centerY - node.y) * 0.001;

      // Repulsion between nodes
      for (const other of graphNodes) {
        if (node === other) continue;
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 1000 / (dist * dist);
        node.vx += (dx / dist) * force;
        node.vy += (dy / dist) * force;
      }
    }

    // Edge attraction
    for (const edge of graphEdges) {
      const source = graphNodes.find(n => n.id === edge.source);
      const target = graphNodes.find(n => n.id === edge.target);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 100) * 0.01;

      source.vx += (dx / dist) * force;
      source.vy += (dy / dist) * force;
      target.vx -= (dx / dist) * force;
      target.vy -= (dy / dist) * force;
    }

    // Update positions
    for (const node of graphNodes) {
      node.x += node.vx;
      node.y += node.vy;
      node.x = Math.max(30, Math.min(width - 30, node.x));
      node.y = Math.max(30, Math.min(height - 30, node.y));
    }

    updateGraphPositions();

    iteration++;
    if (iteration < maxIterations) {
      graphSimulation = requestAnimationFrame(simulate);
    }
  }

  simulate();
}

function updateGraphPositions() {
  for (const node of graphNodes) {
    const g = graphSvg.querySelector(`g[data-id="${node.id}"]`);
    if (g) {
      g.setAttribute('transform', `translate(${node.x}, ${node.y})`);
    }
  }

  for (const edge of graphEdges) {
    const source = graphNodes.find(n => n.id === edge.source);
    const target = graphNodes.find(n => n.id === edge.target);
    const line = graphSvg.querySelector(`line[data-source="${edge.source}"][data-target="${edge.target}"]`);
    if (line && source && target) {
      line.setAttribute('x1', source.x);
      line.setAttribute('y1', source.y);
      line.setAttribute('x2', target.x);
      line.setAttribute('y2', target.y);
    }
  }
}

function updateGraphSelection() {
  const depth = parseInt(depthSlider.value);
  depthValue.textContent = depth;

  // Clear all lit states
  graphSvg.querySelectorAll('.graph-node').forEach(g => {
    g.classList.remove('selected', 'lit', 'lit-1', 'lit-2', 'lit-3');
  });
  graphSvg.querySelectorAll('.graph-edge').forEach(e => {
    e.classList.remove('highlight');
  });

  if (!graphSelectedNode) return;

  // Mark selected node
  const selectedG = graphSvg.querySelector(`g[data-id="${graphSelectedNode}"]`);
  if (selectedG) selectedG.classList.add('selected', 'lit');

  // Get connected pages at each depth
  const connectedByDepth = new Map();
  connectedByDepth.set(graphSelectedNode, 0);

  for (let d = 1; d <= depth; d++) {
    const prevDepthNodes = Array.from(connectedByDepth.entries())
      .filter(([id, nodeDepth]) => nodeDepth === d - 1)
      .map(([id]) => id);

    for (const nodeId of prevDepthNodes) {
      const outgoing = graphEdges.filter(e => e.source === nodeId).map(e => e.target);
      const incoming = graphEdges.filter(e => e.target === nodeId).map(e => e.source);

      for (const connectedId of [...outgoing, ...incoming]) {
        if (!connectedByDepth.has(connectedId)) {
          connectedByDepth.set(connectedId, d);
        }
      }
    }
  }

  // Animate ripple effect
  let animationDelay = 0;
  for (let d = 1; d <= depth; d++) {
    const nodesAtDepth = Array.from(connectedByDepth.entries())
      .filter(([id, nodeDepth]) => nodeDepth === d)
      .map(([id]) => id);

    setTimeout(() => {
      for (const nodeId of nodesAtDepth) {
        const g = graphSvg.querySelector(`g[data-id="${nodeId}"]`);
        if (g) g.classList.add('lit', `lit-${d}`);
      }

      // Highlight edges
      for (const edge of graphEdges) {
        const sourceDepth = connectedByDepth.get(edge.source);
        const targetDepth = connectedByDepth.get(edge.target);
        if (sourceDepth !== undefined && targetDepth !== undefined &&
            (sourceDepth <= d && targetDepth <= d)) {
          const line = graphSvg.querySelector(`line[data-source="${edge.source}"][data-target="${edge.target}"]`);
          if (line) line.classList.add('highlight');
        }
      }
    }, animationDelay);

    animationDelay += 200;
  }

  // Update info
  const page = wiki.getPage(graphSelectedNode);
  selectedNodeSpan.textContent = page ? page.title : graphSelectedNode;
  const connectedCount = connectedByDepth.size - 1;
  connectedCountSpan.textContent = `(${connectedCount} connected at depth ${depth})`;
}

let graphDragState = null;

function startGraphDrag(e) {
  const g = e.currentTarget;
  const nodeId = g.dataset.id;
  const node = graphNodes.find(n => n.id === nodeId);
  if (!node) return;

  graphDragState = { node, startX: e.clientX, startY: e.clientY };
  g.classList.add('dragging');

  document.addEventListener('mousemove', onGraphDrag);
  document.addEventListener('mouseup', endGraphDrag);
  e.preventDefault();
}

function onGraphDrag(e) {
  if (!graphDragState) return;

  const rect = graphSvg.getBoundingClientRect();
  graphDragState.node.x = e.clientX - rect.left;
  graphDragState.node.y = e.clientY - rect.top;
  graphDragState.node.vx = 0;
  graphDragState.node.vy = 0;

  updateGraphPositions();
}

function endGraphDrag() {
  if (graphDragState) {
    const g = graphSvg.querySelector(`g[data-id="${graphDragState.node.id}"]`);
    if (g) g.classList.remove('dragging');
    graphDragState = null;
  }
  document.removeEventListener('mousemove', onGraphDrag);
  document.removeEventListener('mouseup', endGraphDrag);
}

// ============================================
// EXHIBIT 3: TAG & TYPE WORKSHOP
// ============================================

const typeBuckets = document.getElementById('type-buckets');
const tagBuckets = document.getElementById('tag-buckets');
const workshopSearchInput = document.getElementById('workshop-search-input');

function renderWorkshop() {
  renderTypeBuckets();
  renderTagBuckets();
}

function renderTypeBuckets() {
  typeBuckets.innerHTML = '';

  const types = wiki.getTypes();
  const allPages = wiki.listPages();
  const untypedPages = allPages.filter(p => !p.type);

  for (const type of types) {
    const pages = wiki.getPagesByType(type);
    const bucket = createBucket(getTypeIcon(type) + ' ' + type, pages, 'type', type);
    typeBuckets.appendChild(bucket);
  }

  // Untyped bucket
  if (untypedPages.length > 0) {
    const bucket = createBucket('Untyped', untypedPages, 'type', null);
    typeBuckets.appendChild(bucket);
  }
}

function renderTagBuckets() {
  tagBuckets.innerHTML = '';

  const tags = wiki.getTags();

  for (const tag of tags) {
    const pages = wiki.getPagesByTag(tag);
    const bucket = createBucket('\u{1F3F7}\uFE0F ' + tag, pages, 'tag', tag);
    tagBuckets.appendChild(bucket);
  }
}

function createBucket(label, pages, bucketType, value) {
  const bucket = document.createElement('div');
  bucket.className = 'bucket';
  bucket.dataset.bucketType = bucketType;
  bucket.dataset.value = value || '';

  bucket.innerHTML = `
    <div class="bucket-header">${label}</div>
    <div class="bucket-chips"></div>
  `;

  const chipsContainer = bucket.querySelector('.bucket-chips');

  for (const page of pages) {
    const chip = createPageChip(page);
    chipsContainer.appendChild(chip);
  }

  // Drop handling
  bucket.addEventListener('dragover', (e) => {
    e.preventDefault();
    bucket.classList.add('drop-target');
  });

  bucket.addEventListener('dragleave', () => {
    bucket.classList.remove('drop-target');
  });

  bucket.addEventListener('drop', async (e) => {
    e.preventDefault();
    bucket.classList.remove('drop-target');

    const pageId = e.dataTransfer.getData('text/plain');
    const page = wiki.getPage(pageId);
    if (!page) return;

    if (bucketType === 'type') {
      await wiki.updatePage(pageId, { type: value || undefined });
    } else if (bucketType === 'tag' && value) {
      const currentTags = page.tags || [];
      if (!currentTags.includes(value)) {
        await wiki.updatePage(pageId, { tags: [...currentTags, value] });
      }
    }

    renderWorkshop();
  });

  return bucket;
}

function createPageChip(page) {
  const chip = document.createElement('div');
  chip.className = 'page-chip';
  chip.draggable = true;
  chip.dataset.id = page.id;
  chip.textContent = page.title.length > 15 ? page.title.slice(0, 13) + '...' : page.title;
  chip.title = page.title;

  chip.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', page.id);
    chip.classList.add('dragging');
  });

  chip.addEventListener('dragend', () => {
    chip.classList.remove('dragging');
  });

  chip.addEventListener('click', () => {
    // Highlight all instances of this page
    document.querySelectorAll(`.page-chip[data-id="${page.id}"]`).forEach(c => {
      c.classList.add('highlight');
      setTimeout(() => c.classList.remove('highlight'), 1000);
    });
  });

  return chip;
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Exhibit 1: Living Wiki event listeners
  document.getElementById('wiki-save-btn').addEventListener('click', async () => {
    if (!selectedCardId) return;
    await wiki.updatePage(selectedCardId, {
      title: wikiEditorTitle.value,
      content: wikiEditorContent.value
    });
    renderWikiCards();
    renderGraphExplorer();
    renderWorkshop();
  });

  document.getElementById('wiki-delete-btn').addEventListener('click', async () => {
    if (!selectedCardId) return;
    await wiki.deletePage(selectedCardId);
    cardPositions.delete(selectedCardId);
    selectedCardId = null;
    wikiEditor.classList.remove('visible');
    initializeCardPositions();
    renderWikiCards();
    renderGraphExplorer();
    renderWorkshop();
  });

  document.getElementById('wiki-new-btn').addEventListener('click', async () => {
    const title = prompt('Page title:');
    if (!title) return;
    const page = await wiki.createPage({ title, content: '' });
    const pages = wiki.listPages();
    const col = (pages.length - 1) % 3;
    const row = Math.floor((pages.length - 1) / 3);
    cardPositions.set(page.id, { x: 40 + col * 180, y: 30 + row * 120, isGhost: false });
    selectCard(page.id);
    renderWikiCards();
    renderGraphExplorer();
    renderWorkshop();
  });

  document.getElementById('wiki-arrange-btn').addEventListener('click', () => {
    initializeCardPositions();
    renderWikiCards();
  });

  document.getElementById('wiki-reset-btn').addEventListener('click', async () => {
    wiki = createWiki();
    await wiki.import(initialPages, { mode: 'replace' });
    selectedCardId = null;
    initializeCardPositions();
    renderWikiCards();
    renderGraphExplorer();
    renderWorkshop();
  });

  // Exhibit 2: Graph Explorer event listeners
  depthSlider.addEventListener('input', updateGraphSelection);

  document.getElementById('graph-shake-btn').addEventListener('click', () => {
    for (const node of graphNodes) {
      node.vx += (Math.random() - 0.5) * 50;
      node.vy += (Math.random() - 0.5) * 50;
    }
    startGraphSimulation();
  });

  document.getElementById('graph-fit-btn').addEventListener('click', () => {
    const width = graphSvg.clientWidth || 600;
    const height = 400;
    const margin = 50;

    if (graphNodes.length === 0) return;

    const minX = Math.min(...graphNodes.map(n => n.x));
    const maxX = Math.max(...graphNodes.map(n => n.x));
    const minY = Math.min(...graphNodes.map(n => n.y));
    const maxY = Math.max(...graphNodes.map(n => n.y));

    const scaleX = (width - 2 * margin) / (maxX - minX || 1);
    const scaleY = (height - 2 * margin) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY, 1);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    for (const node of graphNodes) {
      node.x = (node.x - centerX) * scale + width / 2;
      node.y = (node.y - centerY) * scale + height / 2;
    }

    updateGraphPositions();
  });

  document.getElementById('graph-labels-toggle').addEventListener('change', (e) => {
    graphSvg.querySelectorAll('.graph-node text').forEach(text => {
      text.style.display = e.target.checked ? '' : 'none';
    });
  });

  // Exhibit 3: Tag & Type Workshop event listeners
  workshopSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();

    document.querySelectorAll('.page-chip').forEach(chip => {
      const title = chip.title.toLowerCase();
      if (query && title.includes(query)) {
        chip.classList.add('highlight');
      } else {
        chip.classList.remove('highlight');
      }
    });
  });

  document.getElementById('add-type-btn').addEventListener('click', async () => {
    const name = prompt('Type name:');
    if (!name) return;
    // Types are created implicitly when assigned to pages
    alert('Create a page with this type, or drag a page to this bucket.');
  });

  document.getElementById('add-tag-btn').addEventListener('click', async () => {
    const name = prompt('Tag name:');
    if (!name) return;
    // Tags are created implicitly when assigned to pages
    alert('Add this tag to a page to create the bucket.');
  });

  document.getElementById('workshop-reset-btn').addEventListener('click', async () => {
    wiki = createWiki();
    await wiki.import(initialPages, { mode: 'replace' });
    renderWorkshop();
    renderWikiCards();
    renderGraphExplorer();
  });
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  // Import initial data
  await wiki.import(initialPages, { mode: 'replace' });

  // Initialize all exhibits
  initializeCardPositions();
  renderWikiCards();
  renderGraphExplorer();
  renderWorkshop();

  // Set up all event listeners
  setupEventListeners();
}

// Export init function for external use
window.DemoInit = init;

// Call init when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  init().catch(err => {
    console.error('Failed to initialize demo:', err);
  });
});
