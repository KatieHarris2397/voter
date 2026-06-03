// Frontend logic: talks to the JSON API and renders the polls.

const $ = (sel, root = document) => root.querySelector(sel);

const pollsEl = $('#polls');
const emptyEl = $('#empty');
const formEl = $('#new-poll');
const formError = $('#form-error');

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `request failed (${res.status})`);
  return data;
}

function optionRow(poll, option) {
  const row = document.createElement('div');
  row.className = 'option-row';

  const head = document.createElement('div');
  head.className = 'option-head';
  const name = document.createElement('span');
  name.textContent = option.text;
  const count = document.createElement('span');
  count.className = 'count';
  count.textContent = `${option.votes} · ${option.percent}%`;
  head.append(name, count);

  const button = document.createElement('button');
  button.className = 'option-button';
  button.style.setProperty('--pct', `${option.percent}%`);
  button.innerHTML = `<span class="fill"></span><span class="label">Vote</span>`;
  button.addEventListener('click', async () => {
    try {
      await api('POST', `/api/polls/${poll.id}/vote`, { optionId: option.id });
      await load();
    } catch (err) {
      alert(err.message);
    }
  });

  row.append(head, button);
  return row;
}

function pollCard(poll) {
  const li = document.createElement('li');
  li.className = 'poll';

  const h3 = document.createElement('h3');
  h3.textContent = poll.question;

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `${poll.totalVotes} vote${poll.totalVotes === 1 ? '' : 's'}`;

  li.append(h3, meta);
  for (const option of poll.options) li.append(optionRow(poll, option));

  const footer = document.createElement('div');
  footer.className = 'poll-footer';
  const del = document.createElement('button');
  del.className = 'delete';
  del.textContent = 'Delete';
  del.addEventListener('click', async () => {
    if (!confirm('Delete this poll?')) return;
    await api('DELETE', `/api/polls/${poll.id}`);
    await load();
  });
  footer.append(document.createElement('span'), del);
  li.append(footer);
  return li;
}

async function load() {
  const { polls } = await api('GET', '/api/polls');
  pollsEl.innerHTML = '';
  emptyEl.hidden = polls.length > 0;
  for (const poll of polls) pollsEl.append(pollCard(poll));
}

$('#add-option').addEventListener('click', () => {
  const inputs = document.querySelectorAll('#options .option');
  if (inputs.length >= 10) return;
  const input = document.createElement('input');
  input.className = 'option';
  input.placeholder = `Option ${inputs.length + 1}`;
  input.maxLength = 120;
  $('#options').append(input);
});

$('#refresh').addEventListener('click', () => load().catch(console.error));

formEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.hidden = true;
  const question = $('#question').value;
  const options = [...document.querySelectorAll('#options .option')]
    .map((i) => i.value)
    .filter((v) => v.trim());
  try {
    await api('POST', '/api/polls', { question, options });
    formEl.reset();
    await load();
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
});

load().catch((err) => {
  formError.textContent = err.message;
  formError.hidden = false;
});
