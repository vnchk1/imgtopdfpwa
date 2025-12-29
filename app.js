/* ================== GLOBAL ================== */
let imageFiles = [];

const isAndroid = /Android/i.test(navigator.userAgent);
const MAX_CANVAS_SIZE = 4096;

/* ================== INIT ================== */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('imageInput').addEventListener('change', e => {
        addImages(Array.from(e.target.files));
    });

    document.getElementById('convertBtn').addEventListener('click', handleConvert);
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

        if (imageFiles.some(f => f.name === file.name && f.size === file.size)) {
            return;
        }

        imageFiles.push(file);
        createPreview(file);
    });

    updateConvertButton();
}

/* ================== PREVIEW ================== */
function createPreview(file) {
    const preview = document.getElementById('imagePreview');

    const item = document.createElement('div');
    item.className = 'image-preview-item';
    item.dataset.filename = file.name;

    const img = document.createElement('img');
    const ext = file.name.toLowerCase();

    if (ext.endsWith('.heic') || ext.endsWith('.heif')) {
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5IRUlDPC90ZXh0Pjwvc3ZnPg==';
    } else {
        const reader = new FileReader();
        reader.onload = e => img.src = e.target.result;
        reader.readAsDataURL(file);
    }

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-btn';
    removeBtn.onclick = () => removeImage(file.name);

    const name = document.createElement('div');
    name.className = 'image-name';
    name.textContent = file.name;

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

/* ================== DRAG DROP ================== */
function setupDragAndDrop() {
    const c = document.querySelector('.container');
    ['dragenter','dragover','dragleave','drop'].forEach(e =>
        c.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); })
    );
    c.addEventListener('drop', e => addImages(Array.from(e.dataTransfer.files)));
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

/* ================== MAIN ================== */
async function handleConvert() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 1;

    for (let i = 0; i < imageFiles.length; i++) {
        let file = imageFiles[i];
        let blob = file;

        if (file.name.toLowerCase().match(/\.(heic|heif)$/)) {
            blob = await convertHeicToJpeg(file);
        }

        const canvas = await loadImageToCanvas(blob);
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
    }

    downloadPDF(pdf.output('blob'), `images_${Date.now()}.pdf`);
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
