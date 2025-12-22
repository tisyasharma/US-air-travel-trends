/**
 * market-share.js
 * Airline market share stacked area chart with interactive filtering
 */

import * as d3 from 'd3';
import { dataCache, enabledCarriers } from '../hooks/useData.js';
import { formatPct, displayCarrier, legendLabel } from '../utils/helpers.js';
import { MARKET_COLORS } from '../utils/constants.js';
import { tooltip, hideTooltip } from './tooltip.js';

/**
 * Airline market-share with 100% stacked area
 * @param {Object} options - Render options
 * @param {boolean} options.preserveEnabled - Whether to preserve current carrier selection
 */
export function renderMarketShare({ preserveEnabled = false } = {}) {
  const container = d3.select('#marketShareChart');
  const legendEl = document.getElementById('marketLegend');
  const node = container.node();
  container.selectAll('svg').remove();
  container.selectAll('.chart-meta').remove();
  if (!node) return;

  if (!dataCache.marketShare.length) {
    if (legendEl) legendEl.innerHTML = '';
    container.append('div').attr('class', 'muted').style('padding', '12px').text('Market share data unavailable.');
    return;
  }

  try {
    if (legendEl) legendEl.innerHTML = '';

    // Order carriers by latest month that keeps mergers sensible, push Other to the end
    const latestDate = d3.max(dataCache.marketShare, (d) => d.date);
    const latestSlice = dataCache.marketShare.filter((d) => +d.date === +latestDate);
    const ranked = latestSlice
      .sort((a, b) => b.market_share - a.market_share)
      .map((d) => d.UNIQUE_CARRIER_NAME);
    const allCarriers = Array.from(new Set(dataCache.marketShare.map((d) => d.UNIQUE_CARRIER_NAME))).filter(Boolean);

    // Single "Other" bucket at the end
    const order = Array.from(
      new Set([...ranked.filter((c) => c !== 'Other'), ...allCarriers.filter((c) => c !== 'Other'), 'Other'])
    );
    if (!order.length) {
      container.append('div').attr('class', 'muted').style('padding', '12px').text('Market share data unavailable.');
      return;
    }

    // Track enabled carriers and default to top 8 if nothing selected, unless preserving current selections
    if (!enabledCarriers.size && !preserveEnabled) {
      ranked.slice(0, 8).forEach((c) => enabledCarriers.add(c));
      if (!enabledCarriers.size) {
        order.slice(0, 8).forEach((c) => enabledCarriers.add(c));
      }
    }
    const activeOrder = order.filter((c) => enabledCarriers.has(c));
    const inactiveOrder = order.filter((c) => !enabledCarriers.has(c));
    if (!activeOrder.length) {
      activeOrder.push(order[0]);
      enabledCarriers.add(order[0]);
    }

    // Colorblind-friendly palette (using MARKET_COLORS)
    const palette = order.map((_, i) => MARKET_COLORS[i % MARKET_COLORS.length]);
    const color = d3.scaleOrdinal().domain(order).range(palette);

    // Group by month, keep precomputed percentages
    const byDate = d3.rollups(
      dataCache.marketShare,
      (v) => {
        const entry = { date: v[0].date };
        order.forEach((c) => (entry[c] = 0));
        v.forEach((d) => {
          entry[d.UNIQUE_CARRIER_NAME] = d.market_share || 0;
        });
        return entry;
      },
      (d) => d.date.getTime()
    );
    const seriesInput = byDate
      .map(([, val]) => {
        const hiddenShare = inactiveOrder.reduce((sum, c) => sum + (val[c] || 0), 0);
        return { ...val, __hidden: hiddenShare };
      })
      .sort((a, b) => a.date - b.date);
    if (!seriesInput.length) {
      container.append('div').attr('class', 'muted').style('padding', '12px').text('Market share data unavailable.');
      return;
    }

    const width = node.clientWidth || 960;
    const height = node.clientHeight || 360;
    const margin = { top: 10, right: 16, bottom: 30, left: 48 };
    const xDomainNums = d3.extent(seriesInput, (d) => +d.date);
    if (!xDomainNums[0] || !xDomainNums[1]) {
      console.error('Market share: invalid x-domain', xDomainNums);
      container.append('div').attr('class', 'muted').style('padding', '12px').text('Market share domain missing.');
      return;
    }
    const x = d3
      .scaleUtc()
      .domain([new Date(xDomainNums[0]), new Date(xDomainNums[1])])
      .range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, 1]).range([height - margin.bottom, margin.top]);

    const stackKeys = [...activeOrder, '__hidden'];
    const stack = d3
      .stack()
      .keys(stackKeys)
      .value((d, key) => d[key] || 0)
      .offset(d3.stackOffsetNone);
    const stacked = stack(seriesInput);
    const hiddenSeries = stacked.find((s) => s.key === '__hidden');
    const visibleStack = stacked.filter((s) => s.key !== '__hidden');

    console.log('market-share debug', {
      rows: dataCache.marketShare.length,
      carriers: order.length,
      series: seriesInput.length,
      width,
      height,
      xDomain: xDomainNums,
      first: seriesInput[0],
      last: seriesInput[seriesInput.length - 1],
    });

    const svg = container.append('svg').attr('width', width).attr('height', height);
    const area = d3
      .area()
      .x((d) => x(d.data.date))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveMonotoneX);

    // Draw the aggregated hidden share (unselected carriers) first so visible bands sit on top
    const hasHidden =
      hiddenSeries && hiddenSeries.some((seg) => seg[1] - seg[0] > 0.00001 && Number.isFinite(seg[1]));
    if (hasHidden) {
      svg
        .append('g')
        .selectAll('path')
        .data([hiddenSeries])
        .join('path')
        .attr('fill', '#e5e7eb')
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.6)
        .attr('opacity', 0.8)
        .attr('d', area);
    }

    svg
      .append('g')
      .selectAll('path')
      .data(visibleStack)
      .join('path')
      .attr('fill', (d) => color(d.key))
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.6)
      .attr('opacity', 0.95)
      .attr('d', area);

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(width < 640 ? 6 : 10).tickFormat(d3.utcFormat('%Y')))
      .selectAll('text')
      .style('font-size', '12px');

    svg
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')))
      .call((g) => g.select('.domain').remove())
      .selectAll('text')
      .style('font-size', '12px');

    const pointer = svg
      .append('line')
      .attr('stroke', '#111827')
      .attr('stroke-opacity', 0.2)
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .style('display', 'none');

    const bisect = d3.bisector((d) => d.date).center;
    const formatMonth = d3.timeFormat('%b %Y');
    svg
      .append('rect')
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', width - margin.left - margin.right)
      .attr('height', height - margin.top - margin.bottom)
      .on('mousemove', (event) => {
        const [mx, my] = d3.pointer(event);
        const i = bisect(seriesInput, x.invert(mx));
        const idx = Math.max(0, Math.min(seriesInput.length - 1, i));
        const row = seriesInput[idx];
        pointer.style('display', null).attr('x1', mx).attr('x2', mx);

        // Identify which carrier band the pointer is over
        const shareAt = y.invert(my);
        let carrierUnder = null;
        let shareExact = null;
        for (const series of stacked) {
          const seg = series[idx];
          if (shareAt >= seg[0] && shareAt <= seg[1]) {
            carrierUnder = series.key;
            shareExact = row[series.key] ?? seg[1] - seg[0];
            break;
          }
        }

        const hiddenShare = row.__hidden || 0;
        const rows = [
          ...activeOrder
            .map((c) => ({ carrier: c, share: row[c] || 0 }))
            .filter((d) => d.share > 0)
            .sort((a, b) => b.share - a.share)
            .slice(0, 8),
          ...(hiddenShare > 0 ? [{ carrier: '__hidden', share: hiddenShare }] : []),
        ]
          .map((d) => {
            const label = d.carrier === '__hidden' ? 'Unselected carriers' : displayCarrier(d.carrier);
            return `<div>${label}: ${formatPct(d.share)}</div>`;
          })
          .join('');
        const focusColor =
          carrierUnder === '__hidden' ? '#9ca3af' : carrierUnder ? color(carrierUnder) : null;
        const focusLine = carrierUnder
          ? `<strong style="color:${focusColor}">${
              carrierUnder === '__hidden' ? 'Unselected carriers' : displayCarrier(carrierUnder)
            }</strong> — ${formatPct(shareExact)}`
          : 'Market share';
        const html = `<div><strong>${formatMonth(row.date)}</strong><div class="muted">${focusLine}</div></div>${rows}`;
        const [px, py] = d3.pointer(event, document.body);
        tooltip
          .html(html)
          .style('opacity', 1)
          .style('display', 'block')
          .style('left', `${px + 14}px`)
          .style('top', `${py + 14}px`);
      })
      .on('mouseleave', () => {
        pointer.style('display', 'none');
        hideTooltip();
      });

    // Legend after successful render
    if (legendEl) {
      const latestShareMap = new Map(latestSlice.map((d) => [d.UNIQUE_CARRIER_NAME, d.market_share || 0]));
      legendEl.innerHTML = order
        .map(
          (c, idx) => `
          <label class="ms-legend-item">
            <input type="checkbox" data-carrier="${c}" ${enabledCarriers.has(c) ? 'checked' : ''}/>
            <span class="ms-legend-dot" style="background:${color(c)}"></span>
            <span class="ms-legend-name">${idx + 1}. ${legendLabel(c)}</span>
            <span class="ms-legend-share"></span>
          </label>
        `
        )
        .join('');
      legendEl.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        input.addEventListener('change', (e) => {
          const carrier = e.target.getAttribute('data-carrier');
          if (e.target.checked) enabledCarriers.add(carrier);
          else enabledCarriers.delete(carrier);
          renderMarketShare({ preserveEnabled: true });
        });
      });
    }

    container
      .append('div')
      .attr('class', 'chart-meta')
      .text(
        `Series: ${seriesInput.length} · Carriers: ${activeOrder.length}${hasHidden ? ' · Grey band = unselected share' : ''}`
      );
  } catch (err) {
    console.error('Market share render failed', err);
    container.append('div').attr('class', 'muted').style('padding', '12px').text('Market share chart failed to render.');
  }
}
