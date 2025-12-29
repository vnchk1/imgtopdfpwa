// Глобальные переменные
let imageFiles = [];

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const convertBtn = document.getElementById('convertBtn');
    const imagePreview = document.getElementById('imagePreview');

    // Обработка выбора файлов
    imageInput.addEventListener('change', handleFileSelect);

    // Обработка конвертации
    convertBtn.addEventListener('click', handleConvert);

    // Drag and drop
    setupDragAndDrop();
});

// Обработка выбора файлов
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    addImages(files);
}

// Добавление изображений
function addImages(files) {
    files.forEach(file => {
        // Проверка типа файла
        // На Android file.type может быть пустым, поэтому проверяем расширение в первую очередь
        const fileExtension = file.name.toLowerCase().split('.').pop();
        const validExtensions = ['jpg', 'jpeg', 'png', 'heic', 'heif'];
        const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
        
        // Проверяем расширение файла (более надежно на Android)
        const isValidExtension = validExtensions.includes(fileExtension);
        // Проверяем MIME тип (может быть пустым на Android)
        const isValidMimeType = file.type && validMimeTypes.includes(file.type.toLowerCase());
        
        // Файл валиден если есть валидное расширение ИЛИ валидный MIME тип
        if (!isValidExtension && !isValidMimeType) {
            showError(`Файл ${file.name} не поддерживается. Поддерживаются: JPEG, PNG, HEIF/HEIC`);
            return;
        }

        // Проверка на дубликаты
        if (imageFiles.some(f => f.name === file.name && f.size === file.size)) {
            return;
        }

        imageFiles.push(file);
        createImagePreview(file);
    });

    updateConvertButton();
}

// Создание превью изображения
function createImagePreview(file) {
    const preview = document.getElementById('imagePreview');
    const item = document.createElement('div');
    item.className = 'image-preview-item';
    item.dataset.filename = file.name;

    const img = document.createElement('img');
    const reader = new FileReader();

    // Обработка успешной загрузки
    reader.onload = (e) => {
        img.src = e.target.result;
    };

    // Обработка ошибок (важно для Android)
    reader.onerror = (e) => {
        console.error('Ошибка чтения файла:', file.name, e);
        // Показываем placeholder при ошибке
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2ZmYzEwNyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FcnJvcjwvdGV4dD48L3N2Zz4=';
    };

    // Для HEIF/HEIC создаем placeholder (проверяем по расширению, т.к. file.type может быть пустым)
    const fileNameLower = file.name.toLowerCase();
    if (fileNameLower.endsWith('.heic') || fileNameLower.endsWith('.heif') ||
        file.type === 'image/heic' || file.type === 'image/heif') {
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5IRUlGPC90ZXh0Pjwvc3ZnPg==';
    } else {
        // Читаем файл с обработкой ошибок
        try {
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Ошибка при чтении файла:', file.name, error);
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2ZmYzEwNyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FcnJvcjwvdGV4dD48L3N2Zz4=';
        }
    }

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => removeImage(file.name);

    const nameLabel = document.createElement('div');
    nameLabel.className = 'image-name';
    nameLabel.textContent = file.name;

    item.appendChild(img);
    item.appendChild(removeBtn);
    item.appendChild(nameLabel);
    preview.appendChild(item);
}

// Удаление изображения
function removeImage(filename) {
    imageFiles = imageFiles.filter(f => f.name !== filename);
    const item = document.querySelector(`[data-filename="${filename}"]`);
    if (item) {
        item.remove();
    }
    updateConvertButton();
}

// Обновление кнопки конвертации
function updateConvertButton() {
    const convertBtn = document.getElementById('convertBtn');
    convertBtn.disabled = imageFiles.length === 0;
}

// Настройка drag and drop
function setupDragAndDrop() {
    const container = document.querySelector('.container');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        container.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        container.addEventListener(eventName, () => {
            container.style.opacity = '0.7';
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        container.addEventListener(eventName, () => {
            container.style.opacity = '1';
        });
    });

    container.addEventListener('drop', (e) => {
        const files = Array.from(e.dataTransfer.files);
        addImages(files);
    });
}

// Конвертация HEIF/HEIC в JPEG
async function convertHeicToJpeg(file) {
    try {
        if (typeof heic2any === 'undefined') {
            throw new Error('Библиотека heic2any не загружена');
        }

        const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.92
        });

        // heic2any может вернуть массив или один blob
        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        return blob;
    } catch (error) {
        console.error('Ошибка конвертации HEIC:', error);
        throw new Error(`Не удалось конвертировать ${file.name}: ${error.message}`);
    }
}

// Получение даты создания изображения
async function getImageDate(file) {
    // Используем lastModified как дату создания
    // Для более точной даты из EXIF нужна дополнительная библиотека (например, exif-js)
    return file.lastModified ? new Date(file.lastModified) : new Date();
}

// Загрузка изображения в canvas
function loadImageToCanvas(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        
        // Таймаут для Android (на случай зависания)
        const timeout = setTimeout(() => {
            URL.revokeObjectURL(url);
            reject(new Error('Таймаут загрузки изображения'));
        }, 30000); // 30 секунд
        
        img.onload = () => {
            clearTimeout(timeout);
            URL.revokeObjectURL(url);
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas);
            } catch (error) {
                reject(new Error(`Ошибка создания canvas: ${error.message}`));
            }
        };
        
        img.onerror = (error) => {
            clearTimeout(timeout);
            URL.revokeObjectURL(url);
            reject(new Error('Не удалось загрузить изображение. Возможно, файл поврежден.'));
        };
        
        // Устанавливаем crossOrigin для предотвращения проблем с CORS
        img.crossOrigin = 'anonymous';
        img.src = url;
    });
}

// Сортировка изображений
async function sortImages(files) {
    const sortOption = document.getElementById('sortOption').value;
    
    if (sortOption === 'name') {
        return files.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        // Сортировка по дате
        const filesWithDates = await Promise.all(
            files.map(async (file) => ({
                file,
                date: await getImageDate(file)
            }))
        );
        
        filesWithDates.sort((a, b) => a.date - b.date);
        return filesWithDates.map(item => item.file);
    }
}

// Основная функция конвертации
async function handleConvert() {
    const convertBtn = document.getElementById('convertBtn');
    const progressSection = document.getElementById('progressSection');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const imageStatusList = document.getElementById('imageStatusList');
    const errorSection = document.getElementById('errorSection');

    // Сброс UI
    convertBtn.disabled = true;
    progressSection.style.display = 'block';
    errorSection.style.display = 'none';
    errorSection.innerHTML = '';
    imageStatusList.innerHTML = '';
    progressBar.style.width = '0%';

    try {
        // Сортировка изображений
        progressText.textContent = 'Сортировка изображений...';
        const sortedFiles = await sortImages([...imageFiles]);
        
        // Получение настроек
        const orientation = document.getElementById('orientation').value;
        const isPortrait = orientation === 'portrait';
        
        // Создание PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: isPortrait ? 'portrait' : 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Минимальные отступы (1mm с каждой стороны для предотвращения обрезки при печати)
        const margin = 1;
        const maxWidth = pdfWidth - (margin * 2);
        const maxHeight = pdfHeight - (margin * 2);

        let processedCount = 0;
        const totalImages = sortedFiles.length;

        // Обработка каждого изображения
        for (let i = 0; i < sortedFiles.length; i++) {
            const file = sortedFiles[i];
            const statusItem = createStatusItem(file.name, 'processing', '⏳ Обработка...');
            imageStatusList.appendChild(statusItem);

            try {
                // Конвертация HEIF/HEIC если нужно
                // Проверяем по расширению файла (более надежно на Android)
                let imageBlob = file;
                const fileNameLower = file.name.toLowerCase();
                const isHeic = fileNameLower.endsWith('.heic') || fileNameLower.endsWith('.heif') ||
                               file.type === 'image/heic' || file.type === 'image/heif';
                
                if (isHeic) {
                    updateStatusItem(statusItem, 'processing', '🔄 Конвертация HEIC...');
                    imageBlob = await convertHeicToJpeg(file);
                }

                // Загрузка изображения
                updateStatusItem(statusItem, 'processing', '📥 Загрузка...');
                const canvas = await loadImageToCanvas(imageBlob);

                // Расчет размеров для вставки в PDF
                // Конвертируем пиксели в мм (96 DPI: 1px ≈ 0.264583mm)
                const pxToMm = 0.264583;
                let imgWidthMm = canvas.width * pxToMm;
                let imgHeightMm = canvas.height * pxToMm;
                
                // Масштабирование с сохранением пропорций
                // Используем почти все доступное пространство (99%) для минимизации полей
                const scaleFactor = 0.99;
                const targetWidth = maxWidth * scaleFactor;
                const targetHeight = maxHeight * scaleFactor;
                
                // Вычисляем коэффициент масштабирования для вписывания в целевой размер
                const widthRatio = targetWidth / imgWidthMm;
                const heightRatio = targetHeight / imgHeightMm;
                const ratio = Math.min(widthRatio, heightRatio);
                
                // Применяем масштабирование
                imgWidthMm = imgWidthMm * ratio;
                imgHeightMm = imgHeightMm * ratio;
                
                // Центрирование на странице
                const x = (pdfWidth - imgWidthMm) / 2;
                const y = (pdfHeight - imgHeightMm) / 2;

                // Добавление новой страницы если нужно (кроме первой)
                if (i > 0) {
                    pdf.addPage();
                }

                // Добавление изображения в PDF
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                pdf.addImage(imgData, 'JPEG', x, y, imgWidthMm, imgHeightMm, undefined, 'FAST');

                processedCount++;
                updateStatusItem(statusItem, 'success', '✅ Готово');
                
                // Обновление прогресса
                const progress = (processedCount / totalImages) * 100;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `Обработано: ${processedCount} из ${totalImages}`;

            } catch (error) {
                console.error(`Ошибка обработки ${file.name}:`, error);
                updateStatusItem(statusItem, 'error', `❌ Ошибка: ${error.message}`);
            }
        }

        if (processedCount === 0) {
            throw new Error('Не удалось обработать ни одного изображения');
        }

        // Сохранение PDF
        progressText.textContent = 'Сохранение PDF...';
        const pdfBlob = pdf.output('blob');
        const fileName = `images_${new Date().toISOString().split('T')[0]}.pdf`;
        
        // Использование File System Access API если доступен, иначе скачивание
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'PDF файлы',
                        accept: { 'application/pdf': ['.pdf'] }
                    }]
                });
                const writable = await fileHandle.createWritable();
                await writable.write(pdfBlob);
                await writable.close();
                progressText.textContent = `✅ PDF сохранен: ${fileHandle.name}`;
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Ошибка сохранения через File System API:', error);
                    // Fallback на скачивание
                    downloadPDF(pdfBlob, fileName);
                    progressText.textContent = `✅ PDF скачан: ${fileName}`;
                }
            }
        } else {
            // Fallback для браузеров без File System Access API
            downloadPDF(pdfBlob, fileName);
            progressText.textContent = `✅ PDF скачан: ${fileName}`;
        }

        progressBar.style.width = '100%';
        convertBtn.disabled = false;

    } catch (error) {
        console.error('Ошибка конвертации:', error);
        errorSection.style.display = 'block';
        errorSection.textContent = `Ошибка: ${error.message}`;
        progressText.textContent = 'Ошибка конвертации';
        convertBtn.disabled = false;
    }
}

// Скачивание PDF (fallback)
function downloadPDF(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Создание элемента статуса
function createStatusItem(filename, status, text) {
    const item = document.createElement('div');
    item.className = `image-status-item ${status}`;
    item.innerHTML = `
        <span class="status-icon">${text.split(' ')[0]}</span>
        <span class="status-text">${filename}: ${text.substring(text.indexOf(' ') + 1)}</span>
    `;
    return item;
}

// Обновление элемента статуса
function updateStatusItem(item, status, text) {
    item.className = `image-status-item ${status}`;
    const icon = text.split(' ')[0];
    const rest = text.substring(text.indexOf(' ') + 1);
    item.innerHTML = `
        <span class="status-icon">${icon}</span>
        <span class="status-text">${item.querySelector('.status-text').textContent.split(':')[0]}: ${rest}</span>
    `;
}

// Показ ошибки
function showError(message) {
    const errorSection = document.getElementById('errorSection');
    errorSection.style.display = 'block';
    errorSection.textContent = message;
    setTimeout(() => {
        errorSection.style.display = 'none';
    }, 5000);
}

