/* ================== GLOBAL ================== */
let imageFiles = []; // Массив объектов {file, rotation, id}
let imageCounter = 0;
let customOrder = null; // null - использовать сортировку, массив - использовать кастомный порядок

const isAndroid = /Android/i.test(navigator.userAgent);
const MAX_CANVAS_SIZE = 4096;

/* ================== INIT ================== */
document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    imageInput.addEventListener('change', e => addImages(Array.from(e.target.files)));

    document.getElementById('convertBtn').addEventListener('click', handleConvert);
    
    const sortOption = document.getElementById('sortOption');
    if (sortOption) {
        sortOption.addEventListener('change', () => {
            customOrder = null; // Сбрасываем кастомный порядок при изменении сортировки
            applySort();
        });
    }
    
    setupDragAndDrop();
});

/* ================== FILE ADD ================== */
function addImages(files) {
    const validExt = ['jpg', 'jpeg', 'png', 'heic', 'heif'];

    files.forEach(file => {
        const ext = (file.name || '').toLowerCase().split('.').pop();

        if (!validExt.includes(ext)) {
            showError(`Файл ${file.name} не поддерживается`);
            return;
        }

        if (!file.size) {
            showError(`Файл ${file.name} пустой`);
            return;
        }

        if (imageFiles.some(f => f.file.name === file.name && f.file.size === file.size)) {
            return;
        }

        const imageData = {
            file: file,
            rotation: 0,
            id: imageCounter++
        };

        imageFiles.push(imageData);
        createPreview(imageData);
    });

    updateConvertButton();
}

/* ================== PREVIEW ================== */
function createPreview(imageData) {
    const preview = document.getElementById('imagePreview');

    const item = document.createElement('div');
    item.className = 'image-preview-item';
    item.dataset.imageId = imageData.id;
    item.draggable = true;

    const img = document.createElement('img');
    img.draggable = false; // Предотвращаем скачивание файла при перетаскивании
    const ext = imageData.file.name.toLowerCase();

    if (ext.endsWith('.heic') || ext.endsWith('.heif')) {
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5IRUlDPC90ZXh0Pjwvc3ZnPg==';
    } else {
        const reader = new FileReader();
        reader.onload = e => {
            img.src = e.target.result;
            applyRotation(img, imageData.rotation);
        };
        reader.readAsDataURL(imageData.file);
    }

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-btn';
    removeBtn.draggable = false; // Предотвращаем перетаскивание при клике на кнопку
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeImage(imageData.id);
    };

    const rotateBtn = document.createElement('button');
    rotateBtn.innerHTML = '↻';
    rotateBtn.className = 'rotate-btn';
    rotateBtn.draggable = false; // Предотвращаем перетаскивание при клике на кнопку
    rotateBtn.onclick = (e) => {
        e.stopPropagation();
        rotateImage(imageData.id);
    };

    const name = document.createElement('div');
    name.className = 'image-name';
    name.textContent = imageData.file.name;

    item.append(img, removeBtn, rotateBtn, name);
    
    // Drag and drop для изменения порядка
    item.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', imageData.id.toString());
        e.dataTransfer.setData('application/json', JSON.stringify({ id: imageData.id }));
        item.classList.add('dragging');
    });
    
    item.addEventListener('dragend', (e) => {
        e.preventDefault();
        item.classList.remove('dragging');
        document.querySelectorAll('.image-preview-item').forEach(el => el.classList.remove('drag-over'));
    });
    
    item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.effectAllowed === 'move') {
            e.dataTransfer.dropEffect = 'move';
            item.classList.add('drag-over');
        }
    });
    
    item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
    });
    
    item.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        item.classList.remove('drag-over');
        const sourceId = parseInt(e.dataTransfer.getData('text/plain'));
        if (!isNaN(sourceId) && sourceId !== imageData.id) {
            moveImage(sourceId, imageData.id);
        }
    });

    preview.appendChild(item);
}

function applyRotation(img, rotation) {
    if (rotation) {
        img.style.transform = `rotate(${rotation}deg)`;
    } else {
        img.style.transform = '';
    }
}

function removeImage(id) {
    imageFiles = imageFiles.filter(f => f.id !== id);
    document.querySelector(`[data-image-id="${id}"]`)?.remove();
    customOrder = null;
    updateConvertButton();
}

function rotateImage(id) {
    const imageData = imageFiles.find(f => f.id === id);
    if (imageData) {
        imageData.rotation = (imageData.rotation + 90) % 360;
        const item = document.querySelector(`[data-image-id="${id}"]`);
        const img = item?.querySelector('img');
        if (img) {
            applyRotation(img, imageData.rotation);
        }
    }
}

function moveImage(sourceId, targetId) {
    const sourceIndex = imageFiles.findIndex(f => f.id === sourceId);
    const targetIndex = imageFiles.findIndex(f => f.id === targetId);
    
    if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return;
    
    // Удаляем элемент из старого места
    const [moved] = imageFiles.splice(sourceIndex, 1);
    
    // Вычисляем новый индекс с учетом того что элемент уже удален
    let newIndex = targetIndex;
    if (sourceIndex < targetIndex) {
        newIndex = targetIndex - 1;
    }
    
    // Вставляем элемент перед целевым
    imageFiles.splice(newIndex, 0, moved);
    
    // Устанавливаем кастомный порядок
    customOrder = imageFiles.map(f => f.id);
    
    // Переставляем элементы в DOM
    const preview = document.getElementById('imagePreview');
    const sourceElement = document.querySelector(`[data-image-id="${sourceId}"]`);
    const targetElement = document.querySelector(`[data-image-id="${targetId}"]`);
    
    if (sourceElement && targetElement) {
        preview.insertBefore(sourceElement, targetElement);
    }
}

function updateConvertButton() {
    document.getElementById('convertBtn').disabled = imageFiles.length === 0;
}

/* ================== DRAG DROP ================== */
function setupDragAndDrop() {
    const c = document.querySelector('.container');
    ['dragenter','dragover','dragleave','drop'].forEach(e =>
        c.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); })
    );
    c.addEventListener('drop', e => addImages(Array.from(e.dataTransfer.files)));
}

/* ================== IMAGE LOADER ================== */
async function loadImageToCanvas(blob) {
    if (isAndroid && blob.size > 25 * 1024 * 1024) {
        showError('Слишком большое изображение для Android');
        throw new Error('Слишком большое изображение для Android');
    }

    if ('createImageBitmap' in window) {
        try {
            const bitmap = await createImageBitmap(blob);

            let w = bitmap.width;
            let h = bitmap.height;

            if (w > MAX_CANVAS_SIZE || h > MAX_CANVAS_SIZE) {
                const r = Math.min(MAX_CANVAS_SIZE / w, MAX_CANVAS_SIZE / h);
                w = Math.floor(w * r);
                h = Math.floor(h * r);
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0, w, h);
            bitmap.close();
            return canvas;
        } catch (_) {}
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Ошибка чтения файла'));
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                let w = img.naturalWidth;
                let h = img.naturalHeight;

                if (w > MAX_CANVAS_SIZE || h > MAX_CANVAS_SIZE) {
                    const r = Math.min(MAX_CANVAS_SIZE / w, MAX_CANVAS_SIZE / h);
                    w = Math.floor(w * r);
                    h = Math.floor(h * r);
                }

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas);
            };
            img.onerror = () => reject(new Error('Android не смог декодировать изображение'));
            img.src = reader.result;
        };
        reader.readAsDataURL(blob);
    });
}

/* ================== HEIC ================== */
async function convertHeicToJpeg(file) {
    if (typeof heic2any === 'undefined') {
        showError('heic2any не подключен');
        throw new Error('heic2any не подключен');
    }
    const r = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
    return Array.isArray(r) ? r[0] : r;
}

/* ================== ROTATE ================== */
function rotateCanvas(canvas, rotation) {
    const rotatedCanvas = document.createElement('canvas');
    const ctx = rotatedCanvas.getContext('2d');
    
    if (rotation === 90 || rotation === 270) {
        rotatedCanvas.width = canvas.height;
        rotatedCanvas.height = canvas.width;
    } else {
        rotatedCanvas.width = canvas.width;
        rotatedCanvas.height = canvas.height;
    }
    
    ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    
    return rotatedCanvas;
}

/* ================== PROGRESS ================== */
function showProgress() {
    const progressSection = document.getElementById('progressSection');
    const imageStatusList = document.getElementById('imageStatusList');
    progressSection.style.display = 'block';
    imageStatusList.innerHTML = '';
    updateProgress(0, 'Подготовка...');
}

function updateProgress(percent, text) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    progressBar.style.width = `${percent}%`;
    progressBar.textContent = percent > 0 ? `${Math.round(percent)}%` : '';
    progressText.textContent = text;
}

function addImageStatus(filename, status, message = '') {
    const imageStatusList = document.getElementById('imageStatusList');
    const item = document.createElement('div');
    item.className = `image-status-item ${status}`;

    let icon = '⏳';
    if (status === 'processing') icon = '⏳';
    else if (status === 'success') icon = '✅';
    else if (status === 'error') icon = '❌';

    item.innerHTML = `
        <span class="status-icon">${icon}</span>
        <span class="status-text">${filename}${message ? ': ' + message : ''}</span>
    `;

    const existing = Array.from(imageStatusList.children).find(
        el => el.querySelector('.status-text')?.textContent.startsWith(filename)
    );
    if (existing) existing.remove();

    imageStatusList.appendChild(item);
    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideProgress() {
    setTimeout(() => {
        const progressSection = document.getElementById('progressSection');
        progressSection.style.display = 'none';
    }, 2000);
}

/* ================== SORT ================== */
function applySort() {
    const sortOption = document.getElementById('sortOption').value;
    const sorted = [...imageFiles];

    if (sortOption === 'date') {
        sorted.sort((a, b) => {
            const dateA = a.file.lastModified || a.file.lastModifiedDate?.getTime() || 0;
            const dateB = b.file.lastModified || b.file.lastModifiedDate?.getTime() || 0;
            return dateA - dateB;
        });
    } else if (sortOption === 'name') {
        sorted.sort((a, b) => {
            const nameA = (a.file.name || '').toLowerCase();
            const nameB = (b.file.name || '').toLowerCase();
            return nameA.localeCompare(nameB, 'ru');
        });
    }

    imageFiles = sorted;
    
    // Перерисовываем превью
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    imageFiles.forEach(imageData => createPreview(imageData));
}

function sortImageFiles(files) {
    // Если есть кастомный порядок, используем его
    if (customOrder !== null && customOrder.length === files.length) {
        return customOrder.map(id => files.find(f => f.id === id)).filter(Boolean);
    }
    
    // Иначе используем текущий порядок файлов
    return files;
}

/* ================== MAIN ================== */
async function handleConvert() {
    if (imageFiles.length === 0) {
        showError('Нет изображений для конвертации');
        return;
    }

    const convertBtn = document.getElementById('convertBtn');
    convertBtn.disabled = true;
    convertBtn.textContent = 'Конвертация...';
    document.getElementById('errorSection').style.display = 'none';

    try {
        showProgress();
        const orientation = document.getElementById('orientation').value;
        const sortedFiles = sortImageFiles(imageFiles);

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: orientation, unit: 'mm', format: 'a4' });

        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();
        const margin = 1;
        const total = sortedFiles.length;

        for (let i = 0; i < total; i++) {
            const imageData = sortedFiles[i];
            const percent = Math.round(((i + 1) / total) * 100);

            updateProgress(percent, `Обработка ${i + 1} из ${total}: ${imageData.file.name}`);
            addImageStatus(imageData.file.name, 'processing', 'Обработка...');

            try {
                let blob = imageData.file;

                if (imageData.file.name.toLowerCase().match(/\.(heic|heif)$/)) {
                    addImageStatus(imageData.file.name, 'processing', 'Конвертация HEIC...');
                    blob = await convertHeicToJpeg(imageData.file);
                }

                addImageStatus(imageData.file.name, 'processing', 'Загрузка изображения...');
                let canvas = await loadImageToCanvas(blob);

                // Применяем поворот если нужно
                if (imageData.rotation) {
                    canvas = rotateCanvas(canvas, imageData.rotation);
                }

                addImageStatus(imageData.file.name, 'processing', 'Добавление в PDF...');
                const imgData = canvas.toDataURL('image/jpeg', 0.8);

                const pxToMm = 0.264583;
                let w = canvas.width * pxToMm;
                let h = canvas.height * pxToMm;

                const r = Math.min((pw - margin * 2) / w, (ph - margin * 2) / h);
                w *= r; h *= r;

                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h);

                addImageStatus(imageData.file.name, 'success', 'Готово');
            } catch (error) {
                addImageStatus(imageData.file.name, 'error', error.message || 'Ошибка обработки');
            }
        }

        updateProgress(100, 'Создание PDF файла...');
        await new Promise(resolve => setTimeout(resolve, 300));
        downloadPDF(pdf.output('blob'), `images_${Date.now()}.pdf`);
        updateProgress(100, 'Готово! PDF файл скачан');
        hideProgress();

    } catch (error) {
        showError(`Ошибка конвертации: ${error.message || 'Неизвестная ошибка'}`);
        updateProgress(0, 'Ошибка');
    } finally {
        convertBtn.disabled = false;
        convertBtn.textContent = 'Конвертировать в PDF';
    }
}

/* ================== DOWNLOAD ================== */
function downloadPDF(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
}

/* ================== ERROR ================== */
function showError(msg) {
    const e = document.getElementById('errorSection');
    e.textContent = msg;
    e.style.display = 'block';
    setTimeout(() => e.style.display = 'none', 5000);
}
