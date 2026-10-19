import chart from './chart';

import data from '/count.csv?url';
import './style.css';

const res = await fetch(data);
const text = await res.text();
const stats = chart(text);
const startDate = document.querySelector<HTMLInputElement>('#start-date')!;
const endDate = document.querySelector<HTMLInputElement>('#end-date')!;
const status = document.querySelector<HTMLParagraphElement>('#range-status')!;

if (stats.dates.length > 0) {
  const earliest = stats.dates[0];
  const latest = stats.dates[stats.dates.length - 1];
  const defaultStart = new Date(`${latest}T00:00:00Z`);
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 29);
  startDate.value = [earliest, defaultStart.toISOString().slice(0, 10)].sort()[1];
  endDate.value = latest;
  startDate.min = earliest;
  endDate.max = latest;
  startDate.disabled = false;
  endDate.disabled = false;

  function updateRange() {
    startDate.max = endDate.value || latest;
    endDate.min = startDate.value || earliest;
    if (!startDate.checkValidity() || !endDate.checkValidity()) {
      status.textContent = 'Choose a valid start and end date within the available range.';
      status.hidden = false;
      return;
    }
    const count = stats.setDateRange(startDate.value, endDate.value);
    status.textContent = count === 0 ? 'No statistics available for this date range.' : '';
    status.hidden = count > 0;
  }

  startDate.addEventListener('change', updateRange);
  endDate.addEventListener('change', updateRange);
  updateRange();
} else {
  status.textContent = 'No statistics available.';
  status.hidden = false;
}
