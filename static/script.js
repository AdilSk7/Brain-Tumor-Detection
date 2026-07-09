
(function () {
  'use strict';

  const dropZone    = document.getElementById('dropZone');
  const fileInput   = document.getElementById('fileInput');
  const dropIdle    = document.getElementById('dropIdle');
  const dropPreview = document.getElementById('dropPreview');
  const previewImg  = document.getElementById('previewImg');
  const previewName = document.getElementById('previewName');
  const btnRemove   = document.getElementById('btnRemove');
  const btnPredict  = document.getElementById('btnPredict');
  const btnLabel    = btnPredict.querySelector('.btn-label');
  const btnSpinner  = btnPredict.querySelector('.btn-spinner');
  const btnArrow    = btnPredict.querySelector('.btn-arrow');
  const errorBanner = document.getElementById('errorBanner');
  const errorMsg    = document.getElementById('errorMsg');

  const resultEmpty   = document.getElementById('resultEmpty');
  const resultContent = document.getElementById('resultContent');
  const predBox       = document.getElementById('predBox');
  const predClass     = document.getElementById('predClass');
  const predSeverity  = document.getElementById('predSeverity');
  const predDesc      = document.getElementById('predDesc');
  const confValue     = document.getElementById('confValue');
  const confBar       = document.getElementById('confBar');
  const scoresList    = document.getElementById('scoresList');
  
  const themeToggle   = document.getElementById('themeToggle');

  const CLASS_COLORS = {
    glioma:      '#ef4444',
    meningioma:  '#f59e0b',
    notumor:     '#10b981',
    pituitary:   '#6366f1',
  };

  let currentFile = null;
  const MAX_SIZE  = 16 * 1024 * 1024;

  ['dragenter', 'dragover'].forEach(evt =>
    dropZone.addEventListener(evt, e => {
      e.preventDefault();
      dropZone.classList.add('dragging');
    })
  );

  ['dragleave', 'drop'].forEach(evt =>
    dropZone.addEventListener(evt, e => {
      e.preventDefault();
      dropZone.classList.remove('dragging');
    })
  );

  dropZone.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  dropZone.addEventListener('click', e => {
    if (e.target === btnRemove || btnRemove.contains(e.target)) return;
    if (currentFile) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  btnRemove.addEventListener('click', e => {
    e.stopPropagation();
    resetAll();
  });

  const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp'];

  function handleFile(file) {
    hideError();

    if (!ALLOWED.includes(file.type)) {
      showError('Invalid file type.');
      return;
    }

    if (file.size > MAX_SIZE) {
      showError('File too large.');
      return;
    }

    currentFile = file;

    const reader = new FileReader();
    reader.onload = ev => {
      previewImg.src = ev.target.result;
      previewName.textContent = file.name;
      dropIdle.hidden = true;
      dropPreview.hidden = false;
      btnPredict.disabled = false;
    };
    reader.readAsDataURL(file);

    showEmptyResult();
  }

  async function runPrediction() {
    if (!currentFile) return;

    hideError();
    setLoading(true);

    const formData = new FormData();
    formData.append('file', currentFile);

    try {
      const res = await fetch('/predict', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Prediction failed.');
        return;
      }

      showResult(data);

    } catch (err) {
      showError('Server error. Make sure Flask is running.');
    } finally {
      setLoading(false);
    }
  }

  window.runPrediction = runPrediction;

function setLoading(on) {
  btnPredict.disabled = on;
  btnLabel.hidden     = on;
  btnArrow.hidden     = on;
  btnSpinner.hidden   = !on;
}

  function showError(msg) {
    errorMsg.textContent = msg;
    errorBanner.hidden = false;
  }

  function hideError() {
    errorBanner.hidden = true;
  }

  function showEmptyResult() {
    resultEmpty.hidden = false;
    resultContent.hidden = true;
  }

  function showResult(data) {
    const color = data.color || CLASS_COLORS[data.prediction] || '#3b82f6';

    predClass.textContent = data.label;
    predClass.style.color = color;
    predBox.style.borderLeftColor = color;

    predDesc.textContent = data.description || '';

    const conf = data.confidence || 0;
    confValue.textContent = conf.toFixed(1) + '%';
    confBar.style.background = color;
    confBar.style.width = conf + '%';

    scoresList.innerHTML = '';

    Object.entries(data.all_scores || {}).forEach(([cls, val]) => {
      const row = document.createElement('div');
      row.className = 'score-row';
      row.innerHTML = `
        <span>${cls}</span>
        <span>${val.toFixed(1)}%</span>
      `;
      scoresList.appendChild(row);
    });

    resultEmpty.hidden = true;
    resultContent.hidden = false;
  }

  function resetAll() {
    currentFile = null;
    fileInput.value = '';
    previewImg.src = '';
    previewName.textContent = '';
    dropIdle.hidden = false;
    dropPreview.hidden = true;
    btnPredict.disabled = true;
    hideError();
    showEmptyResult();
  }

  window.resetAll = resetAll;

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light');
      themeToggle.textContent =
        document.body.classList.contains('light') ? '🌞' : '🌙';
    });
  }

})();