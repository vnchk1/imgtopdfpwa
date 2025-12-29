/* ================== GLOBAL ================== */
let imageFiles = []; // Массив объектов {blob, name, size, lastModified, type}

const isAndroid = /Android/i.test(navigator.userAgent);
const MAX_CANVAS_SIZE = 4096;

/* ================== INIT ================== */
document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    
    // Убеждаемся что accept правильный для галереи и файлового менеджера
    imageInput.setAttribute('accept', 'image/*');
    
    imageInput.addEventListener('change', async e => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            await addImages(files);
            // Очищаем input, чтобы можно было выбрать те же файлы снова
            e.target.value = '';
        }
    });

    document.getElementById('convertBtn').addEventListener('click', handleConvert);
});

/* ================== FILE ADD ================== */
async function addImages(files) {
    const validExt = ['jpg', 'jpeg', 'png', 'heic', 'heif'];

    for (const file of files) {
        const ext = (file.name || '').toLowerCase().split('.').pop();

        if (!validExt.includes(ext)) {
            showError(`Файл ${file.name} не поддерживается`);
            continue;
        }

        if (!file.size) {
            showError(`Файл ${file.name} пустой`);
            continue;
        }

        // Проверка на дубликаты
        if (imageFiles.some(f => f.name === file.name && f.size === file.size)) {
            continue;
        }

        try {
            // ВАЖНО: Создаем безопасную копию файла как Blob
            // Это гарантирует, что мы не трогаем оригинальный файл на устройстве
            const blob = await createSafeFileCopy(file);
            
            // Сохраняем метаданные и безопасную копию
            const fileData = {
                blob: blob,
                name: file.name,
                size: file.size,
                lastModified: file.lastModified || file.lastModifiedDate?.getTime() || Date.now(),
                type: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`
            };

            imageFiles.push(fileData);
            createPreview(fileData);
        } catch (error) {
            console.error(`Ошибка при создании копии файла ${file.name}:`, error);
            showError(`Не удалось обработать файл ${file.name}: ${error.message}`);
        }
    }

    updateConvertButton();
}

/* ================== SAFE FILE COPY ================== */
async function createSafeFileCopy(file) {
    // Создаем безопасную копию файла как Blob
    // Это гарантирует, что оригинальный файл на устройстве не будет затронут
    if (file instanceof Blob) {
        // Если это уже Blob, создаем новый Blob из него
        return new Blob([file], { type: file.type });
    }
    
    // Для File объектов создаем Blob копию
    // Используем arrayBuffer для безопасного чтения
    const arrayBuffer = await file.arrayBuffer();
    return new Blob([arrayBuffer], { type: file.type });
}

/* ================== PREVIEW ================== */
function createPreview(fileData) {
    const preview = document.getElementById('imagePreview');

    const item = document.createElement('div');
    item.className = 'image-preview-item';
    item.dataset.filename = fileData.name;

    const img = document.createElement('img');
    const ext = fileData.name.toLowerCase();

    if (ext.endsWith('.heic') || ext.endsWith('.heif')) {
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5IRUlDPC90ZXh0Pjwvc3ZnPg==';
    } else {
        // Используем безопасную копию Blob для превью
        const reader = new FileReader();
        reader.onload = e => img.src = e.target.result;
        reader.readAsDataURL(fileData.blob);
    }

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-btn';
    removeBtn.onclick = () => removeImage(fileData.name);

    const name = document.createElement('div');
    name.className = 'image-name';
    name.textContent = fileData.name;

    item.append(img, removeBtn, name);
    preview.appendChild(item);
}

function removeImage(name) {
    imageFiles = imageFiles.filter(f => f.name !== name);
    document.querySelector(`[data-filename="${name}"]`)?.remove();
    updateConvertButton();
}

function updateConvertButton() {
    document.getElementById('convertBtn').disabled = imageFiles.length === 0;
}

/* ================== IMAGE LOADER (ANDROID SAFE) ================== */
async function loadImageToCanvas(blob) {
    if (isAndroid && blob.size > 25 * 1024 * 1024) {
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
        throw new Error('heic2any не подключен');
    }
    const r = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
    return Array.isArray(r) ? r[0] : r;
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
    
    // Удаляем старый статус для этого файла, если есть
    const existing = Array.from(imageStatusList.children).find(
        el => el.querySelector('.status-text')?.textContent.startsWith(filename)
    );
    if (existing) existing.remove();
    
    imageStatusList.appendChild(item);
    // Прокручиваем к последнему элементу
    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideProgress() {
    setTimeout(() => {
        const progressSection = document.getElementById('progressSection');
        progressSection.style.display = 'none';
    }, 2000);
}

/* ================== SORT ================== */
function sortImageFiles(files) {
    const sortOption = document.getElementById('sortOption').value;
    const sorted = [...files];
    
    if (sortOption === 'date') {
        sorted.sort((a, b) => {
            const dateA = a.lastModified || 0;
            const dateB = b.lastModified || 0;
            return dateA - dateB;
        });
    } else if (sortOption === 'name') {
        sorted.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB, 'ru');
        });
    }
    
    return sorted;
}

/* ================== MAIN ================== */
async function handleConvert() {
    if (imageFiles.length === 0) {
        showError('Нет изображений для конвертации');
        return;
    }

    // Блокируем кнопку во время конвертации
    const convertBtn = document.getElementById('convertBtn');
    convertBtn.disabled = true;
    convertBtn.textContent = 'Конвертация...';

    // Скрываем предыдущие ошибки
    document.getElementById('errorSection').style.display = 'none';

    try {
        showProgress();

        // Получаем настройки
        const orientation = document.getElementById('orientation').value;
        const sortedFiles = sortImageFiles(imageFiles);

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: orientation, unit: 'mm', format: 'a4' });

        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();
        const margin = 1;

        const total = sortedFiles.length;

        for (let i = 0; i < total; i++) {
            const fileData = sortedFiles[i];
            const percent = Math.round(((i + 1) / total) * 100);
            
            updateProgress(percent, `Обработка ${i + 1} из ${total}: ${fileData.name}`);
            addImageStatus(fileData.name, 'processing', 'Обработка...');

            try {
                // Используем безопасную копию Blob из fileData
                let blob = fileData.blob;

                // Конвертация HEIC/HEIF
                if (fileData.name.toLowerCase().match(/\.(heic|heif)$/)) {
                    addImageStatus(fileData.name, 'processing', 'Конвертация HEIC...');
                    blob = await convertHeicToJpeg(blob);
                }

                // Загрузка изображения в canvas
                addImageStatus(fileData.name, 'processing', 'Загрузка изображения...');
                const canvas = await loadImageToCanvas(blob);
                
                addImageStatus(fileData.name, 'processing', 'Добавление в PDF...');
                const imgData = canvas.toDataURL('image/jpeg', 0.8);

                const pxToMm = 0.264583;
                let w = canvas.width * pxToMm;
                let h = canvas.height * pxToMm;

                const r = Math.min(
                    (pw - margin * 2) / w,
                    (ph - margin * 2) / h
                );

                w *= r;
                h *= r;

                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG',
                    (pw - w) / 2,
                    (ph - h) / 2,
                    w, h
                );

                addImageStatus(fileData.name, 'success', 'Готово');
            } catch (error) {
                console.error(`Ошибка при обработке ${fileData.name}:`, error);
                addImageStatus(fileData.name, 'error', error.message || 'Ошибка обработки');
                // Продолжаем обработку остальных файлов
            }
        }

        updateProgress(100, 'Создание PDF файла...');
        
        // Небольшая задержка для отображения финального прогресса
        await new Promise(resolve => setTimeout(resolve, 300));
        
        downloadPDF(pdf.output('blob'), `images_${Date.now()}.pdf`);
        
        updateProgress(100, 'Готово! PDF файл скачан');
        hideProgress();

    } catch (error) {
        console.error('Критическая ошибка:', error);
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

