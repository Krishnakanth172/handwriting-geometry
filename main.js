import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const DIGIT_COLORS = [
  '#78a9ff', '#33b1ff', '#08bdba', '#42be65', '#be95ff',
  '#ee5396', '#ff7eb6', '#fa4d56', '#ff832b', '#f1c21b',
];

const data = await d3.csv('./data/digits.csv', (d) => ({
  sampleId: +d.sample_id,
  digit: +d.digit,
  pca1: +d.pca1,
  pca2: +d.pca2,
  pixels: Array.from({ length: 64 }, (_, i) => +d[`p${i}`]),
}));

const byDigit = d3.group(data, (d) => d.digit);
const digitAverages = new Map(
  d3.range(10).map((digit) => [
    digit,
    d3.range(64).map((i) => d3.mean(byDigit.get(digit), (d) => d.pixels[i])),
  ]),
);

const intensityColor = d3.scaleSequential()
  .domain([0, 16])
  .interpolator(d3.interpolateRgbBasis(['#05070a', '#1f365d', '#6ea6ff', '#fff8e8']));

function renderGrid(container, pixels, { difference = false, tooltip = false } = {}) {
  const root = d3.select(container);
  root.selectAll('*').remove();

  const maxDiff = difference ? Math.max(1, d3.max(pixels)) : 16;
  const diffColor = d3.scaleSequential()
    .domain([0, maxDiff])
    .interpolator(d3.interpolateRgbBasis(['#fffaf5', '#ffcf9e', '#ff7a45', '#8d1b0d']));

  root
    .selectAll('div')
    .data(pixels)
    .join('div')
    .attr('class', 'pixel-cell')
    .attr('data-value', tooltip ? (d) => `Intensity: ${d.toFixed(0)}` : null)
    .style('background', (d) => difference ? diffColor(d) : intensityColor(d));
}

function populateSelect(select, value = 0) {
  d3.select(select)
    .selectAll('option')
    .data(d3.range(10))
    .join('option')
    .attr('value', (d) => d)
    .text((d) => d);

  select.value = value;
}

// Hero glyph
renderGrid('#hero-mini-grid', digitAverages.get(8));

// ------------------------------------------------------------
// 1) PIXEL EXPLORER
// ------------------------------------------------------------
const digitSelect = document.querySelector('#digit-select');
populateSelect(digitSelect, 8);
let explorerIndex = 0;

function explorerSamples() {
  return byDigit.get(+digitSelect.value);
}

function updateExplorer() {
  const samples = explorerSamples();
  explorerIndex = (explorerIndex + samples.length) % samples.length;
  const sample = samples[explorerIndex];

  document.querySelector('#sample-id').textContent = `#${sample.sampleId}`;
  renderGrid('#pixel-grid', sample.pixels, { tooltip: true });

  d3.select('#pixel-vector')
    .selectAll('div')
    .data(sample.pixels)
    .join('div')
    .attr('class', 'vector-value')
    .style('background', (d) => {
      if (d === 0) return '#f2f0e9';
      const c = d3.color(intensityColor(d));
      c.opacity = 0.18;
      return `${c}`;
    })
    .text((d) => d.toFixed(0));
}

digitSelect.addEventListener('change', () => {
  explorerIndex = 0;
  updateExplorer();
});
document.querySelector('#previous-sample').addEventListener('click', () => {
  explorerIndex -= 1;
  updateExplorer();
});
document.querySelector('#next-sample').addEventListener('click', () => {
  explorerIndex += 1;
  updateExplorer();
});
updateExplorer();

// ------------------------------------------------------------
// 2) DIGIT GALAXY
// ------------------------------------------------------------
const svg = d3.select('#galaxy-chart');
const tooltip = document.querySelector('#galaxy-tooltip');
const brushToggle = document.querySelector('#brush-toggle');
const clearBrush = document.querySelector('#clear-brush');

let activeDigit = null;
let brushingEnabled = false;
let currentBrushLayer = null;
let currentBrush = null;
let currentPointLayer = null;

const legend = d3.select('#digit-legend');

legend
  .selectAll('button')
  .data(d3.range(10))
  .join('button')
  .attr('class', 'digit-button')
  .attr('type', 'button')
  .attr('aria-label', (d) => `Filter to digit ${d}`)
  .style('background', (d) => DIGIT_COLORS[d])
  .style('color', (d) => d === 9 ? '#111' : '#fff')
  .text((d) => d)
  .on('click', function (_event, digit) {
    activeDigit = activeDigit === digit ? null : digit;
    legend.selectAll('button').classed('active', (d) => d === activeDigit);
    updatePointFilter();
  });

function updatePointFilter() {
  if (!currentPointLayer) return;

  currentPointLayer
    .selectAll('.galaxy-point')
    .classed('filtered', (d) => activeDigit !== null && d.digit !== activeDigit);
}

function setBrushMode(enabled) {
  brushingEnabled = enabled;

  brushToggle.classList.toggle('active', enabled);
  brushToggle.textContent =
    enabled ? 'Selection mode: ON' : 'Select region';

  if (currentBrushLayer) {
    currentBrushLayer
      .selectAll('.overlay, .selection, .handle')
      .style('pointer-events', enabled ? 'all' : 'none');
  }

  if (currentPointLayer) {
    currentPointLayer
      .style('pointer-events', enabled ? 'none' : 'all');
  }

  tooltip.hidden = true;
}

brushToggle.addEventListener('click', () => setBrushMode(!brushingEnabled));

clearBrush.addEventListener('click', () => {
  activeDigit = null;
  legend.selectAll('button').classed('active', false);

  if (currentBrushLayer && currentBrush) {
    currentBrushLayer.call(currentBrush.move, null);
  }

  if (currentPointLayer) {
    currentPointLayer
      .selectAll('.galaxy-point')
      .classed('filtered', false)
      .classed('dimmed', false);
  }

  updateSelectionPanel([]);
  setBrushMode(false);
});

function drawGalaxy() {
  const wrapper = document.querySelector('.galaxy-chart-wrap');
  const width = wrapper.clientWidth;
  const height = document.querySelector('#galaxy-chart').clientHeight || 650;
  const margin = { top: 28, right: 28, bottom: 44, left: 52 };

  svg.attr('viewBox', `0 0 ${width} ${height}`);
  svg.selectAll('*').remove();

  const x = d3.scaleLinear()
    .domain(d3.extent(data, (d) => d.pca1))
    .nice()
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain(d3.extent(data, (d) => d.pca2))
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg.append('g')
    .selectAll('line.x-grid')
    .data(x.ticks(8))
    .join('line')
    .attr('class', 'gridline')
    .attr('x1', (d) => x(d))
    .attr('x2', (d) => x(d))
    .attr('y1', margin.top)
    .attr('y2', height - margin.bottom);

  svg.append('g')
    .selectAll('line.y-grid')
    .data(y.ticks(8))
    .join('line')
    .attr('class', 'gridline')
    .attr('x1', margin.left)
    .attr('x2', width - margin.right)
    .attr('y1', (d) => y(d))
    .attr('y2', (d) => y(d));

  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(8).tickSizeOuter(0));

  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(8).tickSizeOuter(0));

  currentPointLayer = svg.append('g').attr('class', 'point-layer');

  currentPointLayer
    .selectAll('circle')
    .data(data, (d) => d.sampleId)
    .join('circle')
    .attr('class', 'galaxy-point')
    .attr('cx', (d) => x(d.pca1))
    .attr('cy', (d) => y(d.pca2))
    .attr('r', 4.2)
    .attr('fill', (d) => DIGIT_COLORS[d.digit])
    .attr('opacity', 0.72)
    .on('pointerenter', function (event, d) {
      if (brushingEnabled) return;
      d3.select(this).attr('r', 7).raise();
      tooltip.hidden = false;
      tooltip.innerHTML = `
        <div class="tooltip-title">
          <strong>${d.digit}</strong>
          <span>sample #${d.sampleId}</span>
        </div>
        <div class="mini-grid"></div>
      `;
      renderGrid(tooltip.querySelector('.mini-grid'), d.pixels);
      positionTooltip(event);
    })
    .on('pointermove', (event) => {
      if (!brushingEnabled) positionTooltip(event);
    })
    .on('pointerleave', function () {
      d3.select(this).attr('r', 4.2);
      tooltip.hidden = true;
    });

  currentBrush = d3.brush()
    .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
    .on('brush end', ({ selection }) => {
      if (!selection) {
        currentPointLayer.selectAll('.galaxy-point').classed('dimmed', false);
        updateSelectionPanel([]);
        return;
      }

      const [[x0, y0], [x1, y1]] = selection;

      const selected = data.filter((d) =>
        x0 <= x(d.pca1) && x(d.pca1) <= x1 &&
        y0 <= y(d.pca2) && y(d.pca2) <= y1 &&
        (activeDigit === null || d.digit === activeDigit)
      );

      const selectedIds = new Set(selected.map((d) => d.sampleId));

      currentPointLayer
        .selectAll('.galaxy-point')
        .classed('dimmed', (d) => !selectedIds.has(d.sampleId));

      updateSelectionPanel(selected);
    });

  currentBrushLayer = svg.append('g')
    .attr('class', 'brush')
    .call(currentBrush);

  currentBrushLayer
    .selectAll('.overlay, .selection, .handle')
    .style('pointer-events', brushingEnabled ? 'all' : 'none');

  currentPointLayer
    .style('pointer-events', brushingEnabled ? 'none' : 'all');

  updatePointFilter();
}

function positionTooltip(event) {
  const wrapper = document.querySelector('.galaxy-chart-wrap');
  const rect = wrapper.getBoundingClientRect();
  const left = Math.min(rect.width - 185, Math.max(10, event.clientX - rect.left + 15));
  const top = Math.min(rect.height - 200, Math.max(10, event.clientY - rect.top + 15));

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function updateSelectionPanel(samples) {
  document.querySelector('#selection-count').textContent = samples.length.toLocaleString();

  if (!samples.length) {
    document.querySelector('#selection-copy').textContent =
      'Turn on selection mode, then drag across the galaxy to select a neighborhood.';
    d3.select('#selection-bars').selectAll('*').remove();
    renderGrid('#selection-average', Array(64).fill(0));
    return;
  }

  const counts = d3.rollup(samples, (v) => v.length, (d) => d.digit);
  const maxCount = d3.max(d3.range(10), (digit) => counts.get(digit) ?? 0) || 1;
  const dominant = d3.greatest(d3.range(10), (digit) => counts.get(digit) ?? 0);

  document.querySelector('#selection-copy').textContent =
    `Digit ${dominant} is the most common label in this selected neighborhood.`;

  d3.select('#selection-bars')
    .selectAll('.selection-row')
    .data(d3.range(10))
    .join((enter) => {
      const row = enter.append('div').attr('class', 'selection-row');
      row.append('span').attr('class', 'selection-label');
      row.append('div').attr('class', 'selection-track')
        .append('div').attr('class', 'selection-fill');
      row.append('span').attr('class', 'selection-value');
      return row;
    })
    .each(function (digit) {
      const count = counts.get(digit) ?? 0;
      const row = d3.select(this);

      row.select('.selection-label').text(digit);
      row.select('.selection-fill')
        .style('width', `${100 * count / maxCount}%`)
        .style('background', DIGIT_COLORS[digit]);
      row.select('.selection-value').text(count);
    });

  const averagePixels = d3.range(64).map((i) => d3.mean(samples, (d) => d.pixels[i]));
  renderGrid('#selection-average', averagePixels);
}

updateSelectionPanel([]);
drawGalaxy();

const resizeObserver = new ResizeObserver(() => drawGalaxy());
resizeObserver.observe(document.querySelector('.galaxy-chart-wrap'));

// ------------------------------------------------------------
// 3) DIGIT COMPARISON
// ------------------------------------------------------------
const compareA = document.querySelector('#compare-a');
const compareB = document.querySelector('#compare-b');
populateSelect(compareA, 3);
populateSelect(compareB, 8);

function updateComparison() {
  const a = +compareA.value;
  const b = +compareB.value;
  const avgA = digitAverages.get(a);
  const avgB = digitAverages.get(b);
  const difference = avgA.map((value, i) => Math.abs(value - avgB[i]));

  document.querySelector('#compare-a-title').textContent = `Average digit ${a}`;
  document.querySelector('#compare-b-title').textContent = `Average digit ${b}`;

  renderGrid('#average-a', avgA);
  renderGrid('#average-b', avgB);
  renderGrid('#difference-grid', difference, { difference: true });

  const strongestIndex = d3.maxIndex(difference);
  const row = Math.floor(strongestIndex / 8) + 1;
  const col = strongestIndex % 8 + 1;

  document.querySelector('#difference-copy').textContent =
    `The strongest average difference is near row ${row}, column ${col}. Darker cells mark larger differences.`;
}

compareA.addEventListener('change', updateComparison);
compareB.addEventListener('change', updateComparison);
updateComparison();
