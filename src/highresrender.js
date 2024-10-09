document.addEventListener('DOMContentLoaded', function() {
    let progressContainer = document.getElementById('progressContainer');
    let progressBar = document.getElementById('progressBar');
    let resolutionSelect = document.getElementById('resolutionSelect');
    let customResContainer = document.getElementById('customResContainer');

    // Toggle visibility of custom resolution fields
    resolutionSelect.addEventListener('change', function() {
        if (resolutionSelect.value === 'custom') {
            customResContainer.style.display = 'inline-block';
        } else {
            customResContainer.style.display = 'none';
        }
    });

    function renderHighRes(settings) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const { width, height, zoom, offsetX, offsetY, maxIterations, colorScheme } = settings;

        canvas.width = width;
        canvas.height = height;

        let totalPixels = width * height;
        let renderedPixels = 0;
        let chunkSize = 1350;

        // Function to update the progress bar
        function updateProgressBar() {
            let progress = (renderedPixels / totalPixels) * 100;
            progressBar.style.width = progress + "%";
        }

        function renderChunk() {
            for (let i = 0; i < chunkSize; i++) {
                if (renderedPixels >= totalPixels) {
                    saveHighResImage();
                    return;
                }

                let x = renderedPixels % width;
                let y = Math.floor(renderedPixels / width);

                let c = mapToComplexPlane(x, y, width, height, zoom, offsetX, offsetY);
                let n = computeMandelbrot(c, maxIterations);

                let color;
                if (n === maxIterations) {
                    color = 'rgb(0, 0, 0)'; // Points inside the Mandelbrot set are black
                } else {
                    color = getColor(n, maxIterations, colorScheme);
                }
                let [r, g, b] = color.match(/\d+/g).map(Number);

                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(x, y, 1, 1);

                renderedPixels++;
            }

            updateProgressBar();
            requestAnimationFrame(renderChunk); // Continue rendering the next chunk
        }

        function saveHighResImage() {
            const link = document.createElement('a');
            link.download = `mandelbrot_highres_${width}x${height}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            // Hide progress bar after saving
            progressContainer.style.display = "none";
        }

        // Start rendering the image in chunks
        requestAnimationFrame(renderChunk);
    }

    function mapToComplexPlane(x, y, width, height, zoom, offsetX, offsetY) {
        const real = (x - width / 2) / (0.5 * zoom * width) + offsetX;
        const imag = (y - height / 2) / (0.5 * zoom * height) + offsetY;
        return { real, imag };
    }

    function computeMandelbrot(c, maxIterations) {
        let z = { real: 0, imag: 0 };
        let n = 0;
        while (n < maxIterations) {
            const realTemp = z.real * z.real - z.imag * z.imag + c.real;
            z.imag = 2 * z.real * z.imag + c.imag;
            z.real = realTemp;

            if (z.real * z.real + z.imag * z.imag > 4) break;
            n++;
        }
        return n;
    }

    function getColor(n, maxIterations, colorScheme) {
        const t = n / maxIterations;
        switch (colorScheme) {
            case 'grayscale':
                const gray = Math.floor(255 * t);
                return `rgb(${gray},${gray},${gray})`;
            case 'fire':
                const fireRed = Math.floor(255 * t);
                const fireGreen = Math.floor(100 * t);
                return `rgb(${fireRed},${fireGreen},0)`;
            case 'cool':
                const blue = Math.floor(255 * (1 - t));
                const green = Math.floor(255 * t);
                return `rgb(0,${green},${blue})`;
            case 'custom':
                return `rgb(255, 255, 255)`; // Placeholder for custom colors
            default:
                return `rgb(0,0,0)`;
        }
    }

    // Function to handle high-res save
    document.getElementById('saveHighResButton').addEventListener('click', function() {
        const resOption = document.getElementById('resolutionSelect').value;
        let width, height;

        switch (resOption) {
            case '720p':
                width = 1280;
                height = 720;
                break;
            case '1080p':
                width = 1920;
                height = 1080;
                break;
            case '2k':
                width = 2048;
                height = 1080;
                break;
            case '4k':
                width = 3840;
                height = 2160;
                break;
            case 'custom':
                width = parseInt(document.getElementById('customWidth').value);
                height = parseInt(document.getElementById('customHeight').value);
                break;
        }

        const settings = window.mandelbrotSettings; // Retrieve the current view settings
        settings.width = width;
        settings.height = height;

        // Show progress bar and start high-res rendering
        progressContainer.style.display = "block";
        progressBar.style.width = "0%";  // Reset progress
        renderHighRes(settings);
    });
});
