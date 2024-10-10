document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('mandelbrotCanvas');
    const ctx = canvas.getContext('2d');
    const saveButton = document.getElementById('saveButton');
    const saveHighResButton = document.getElementById('saveHighResButton');
    const resolutionSelect = document.getElementById('resolutionSelect');
    const customResContainer = document.getElementById('customResContainer');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressPercentage = document.getElementById('progressPercentage');
    const cancelButtonContainer = document.getElementById('cancelButtonContainer');
    const cancelRenderButton = document.getElementById('cancelRenderButton');
    const timeIndicator = document.getElementById('timeIndicator');

    let worker = null;
    let startTime = 0;
    let timerInterval = null;

    let zoom = 0.5;  // Default zoom to 0.5
    let offsetX = 0;
    let offsetY = 0;
    let maxIterations = 100;
    let colorScheme = 'fire';  // Default color scheme to Fire
    let customColors = { start: '#000000', middle: '#ff0000', end: '#ffffff' };  // Custom colors

    const zoomSlider = document.getElementById('zoomSlider');
    const iterationSlider = document.getElementById('iterationSlider');
    const zoomValue = document.getElementById('zoomValue');
    const iterationValue = document.getElementById('iterationValue');
    const resetButton = document.getElementById('resetButton');
    const colorSchemeDropdown = document.getElementById('colorScheme');
    const customColorsDiv = document.getElementById('customColors');
    const randomControlsDiv = document.getElementById('randomControls');

    // Custom Color Inputs
    const startColorInput = document.getElementById('startColor');
    const middleColorInput = document.getElementById('middleColor');
    const endColorInput = document.getElementById('endColor');

    // Randomization Buttons
    const randomizeAllButton = document.getElementById('randomizeAll');
    const randomizeStartButton = document.getElementById('randomizeStart');
    const randomizeMiddleButton = document.getElementById('randomizeMiddle');
    const randomizeEndButton = document.getElementById('randomizeEnd');

    // Zoom Step Buttons
    const zoomIn1x = document.getElementById('zoomIn1x');
    const zoomIn10x = document.getElementById('zoomIn10x');
    const zoomIn100x = document.getElementById('zoomIn100x');
    const zoomIn1000x = document.getElementById('zoomIn1000x');

    const zoomOut1x = document.getElementById('zoomOut1x');
    const zoomOut10x = document.getElementById('zoomOut10x');
    const zoomOut100x = document.getElementById('zoomOut100x');
    const zoomOut1000x = document.getElementById('zoomOut1000x');

    // Store the current settings in the global object to be passed to highresrender.worker.js
    window.mandelbrotSettings = {
        zoom,
        offsetX,
        offsetY,
        maxIterations,
        colorScheme,
        customColors
    };

    // Update settings on change
    function updateSettings() {
        window.mandelbrotSettings = {
            zoom,
            offsetX,
            offsetY,
            maxIterations,
            colorScheme,
            customColors
        };
    }

    // Function to initialize a new worker
    function initializeWorker() {
        if (worker) {
            worker.terminate(); // Ensure any previous worker is terminated before creating a new one
        }
        worker = new Worker('src/highresrender.worker.js');
        setupWorkerListeners();
    }

    // Function to setup Web Worker message handling
    function setupWorkerListeners() {
        worker.onmessage = function(e) {
            if (e.data.type === 'progress') {
                const progress = e.data.progress;
                progressBar.style.width = `${progress}%`;
                progressPercentage.textContent = `${Math.round(progress)}%`;

                // Update estimated time remaining
                const elapsedTime = (Date.now() - startTime) / 1000; // In seconds
                const estimatedTotalTime = (elapsedTime / progress) * 100; // Estimate total time based on progress
                const remainingTime = estimatedTotalTime - elapsedTime;

                timeIndicator.textContent = `Elapsed: ${formatTime(elapsedTime)}, Remaining: ${formatTime(remainingTime)}`;

            } else if (e.data.type === 'complete') {
                const blob = e.data.blob;
                const link = document.createElement('a');
                link.download = `mandelbrot_highres.png`;
                link.href = URL.createObjectURL(blob);
                link.click();

                // Reset timer, progress bar, and hide elements
                resetRenderState();
            }
        };
    }

    // Helper function to format time in minutes and seconds
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
    }

    // Function to reset progress and timer after render completes/cancels
    function resetRenderState() {
        clearInterval(timerInterval);
        progressBar.style.width = "0%";
        progressPercentage.textContent = '0%';
        progressContainer.style.display = "none";
        cancelButtonContainer.style.display = "none";
        timeIndicator.textContent = 'Elapsed: 0m 0s, Remaining: --';
    }

    // Function to start the high-resolution render
    function startHighResRender() {
        initializeWorker();  // Create a new worker for each render

        const resOption = resolutionSelect.value;
        let width, height;

        switch (resOption) {
            case '4k':
                width = 4096;
                height = 3072;
                break;
            case '2k':
                width = 2048;
                height = 1536;
                break;
            case '1080':
                width = 1440;
                height = 1080;
                break;
            case '720':
                width = 960;
                height = 720;
                break;
            case 'custom':
                width = parseInt(document.getElementById('customWidth').value);
                height = parseInt(document.getElementById('customHeight').value);
                break;
        }

        const settings = window.mandelbrotSettings;
        settings.width = width;
        settings.height = height;

        // Show progress bar and cancel button
        progressContainer.style.display = "block";
        progressBar.style.width = "0%";
        progressPercentage.textContent = '0%';
        cancelButtonContainer.style.display = "flex";

        // Start timing
        startTime = Date.now();
        timerInterval = setInterval(() => {
            const elapsedTime = (Date.now() - startTime) / 1000;
            timeIndicator.textContent = `Elapsed: ${formatTime(elapsedTime)}, Remaining: --`;
        }, 1000); // Update elapsed time every second

        worker.postMessage(settings);  // Send settings to the Web Worker for processing
    }

    // Event listener for the cancel button
    cancelRenderButton.addEventListener('click', function() {
        if (worker) {
            worker.terminate();  // Terminate the worker
            worker = null;

            // Reset progress and hide progress bar and cancel button
            resetRenderState();
        }
    });

    // Save High-Res PNG button event listener
    saveHighResButton.addEventListener('click', function() {
        startHighResRender();  // Start the high-res render when the button is clicked
    });

    // Helper function to map canvas coordinates to complex plane
    function mapToComplexPlane(x, y, width, height, zoom, offsetX, offsetY) {
        const real = (x - width / 2) / (0.5 * zoom * width) + offsetX;
        const imag = (y - height / 2) / (0.5 * zoom * height) + offsetY;
        return { real, imag };
    }

    // Function to compute if a point is in the Mandelbrot set
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

    // Function to create colors based on iterations and selected color scheme
    function getColor(n, maxIterations) {
        if (n === maxIterations) return 'rgb(0, 0, 0)'; // Black for points inside the set

        const t = n / maxIterations;
        switch (colorScheme) {
            case 'grayscale':
                const gray = Math.floor(255 * t);
                return 'rgb(' + gray + ',' + gray + ',' + gray + ')';

            case 'fire':
                const fireRed = Math.floor(255 * t);
                const fireGreen = Math.floor(100 * t);
                return 'rgb(' + fireRed + ',' + fireGreen + ', 0)'; // Red to yellow transition

            case 'cool':
                const blue = Math.floor(255 * (1 - t));
                const green = Math.floor(255 * t);
                return 'rgb(0,' + green + ',' + blue + ')'; // Blue to green transition

            case 'custom': // Custom gradient
                return getCustomGradientColor(t);

            default:
                const hue = Math.floor(360 * t); // Map iterations to hue (0-360)
                const saturation = 100;
                const lightness = t < 1 ? 50 : 0; // Brighter for fewer iterations
                return 'hsl(' + hue + ',' + saturation + '%, ' + lightness + '%)';
        }
    }

    // Generate a custom gradient color based on t (0 to 1)
    function getCustomGradientColor(t) {
        const startColor = hexToRgb(customColors.start);
        const middleColor = hexToRgb(customColors.middle);
        const endColor = hexToRgb(customColors.end);

        let color;
        if (t < 0.5) {
            color = interpolateColor(startColor, middleColor, t * 2); // Interpolate between start and middle
        } else {
            color = interpolateColor(middleColor, endColor, (t - 0.5) * 2); // Interpolate between middle and end
        }

        return 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
    }

    // Interpolate between two colors (start and end) based on t (0 to 1)
    function interpolateColor(start, end, t) {
        return {
            r: Math.floor(start.r + (end.r - start.r) * t),
            g: Math.floor(start.g + (end.g - start.g) * t),
            b: Math.floor(start.b + (end.b - start.b) * t)
        };
    }

    // Convert hex color to rgb
    function hexToRgb(hex) {
        const bigint = parseInt(hex.slice(1), 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
        };
    }

    // Function to generate a random hex color
    function generateRandomColor() {
        const randomColor = Math.floor(Math.random() * 16777215).toString(16);
        return '#' + randomColor.padStart(6, '0');
    }

    // Randomize all colors
    function randomizeAllColors() {
        startColorInput.value = generateRandomColor();
        middleColorInput.value = generateRandomColor();
        endColorInput.value = generateRandomColor();
        customColors = {
            start: startColorInput.value,
            middle: middleColorInput.value,
            end: endColorInput.value
        };
        updateSettings();
        drawMandelbrot();
    }

    // Randomize individual colors
    function randomizeStartColor() {
        startColorInput.value = generateRandomColor();
        customColors.start = startColorInput.value;
        updateSettings();
        drawMandelbrot();
    }

    function randomizeMiddleColor() {
        middleColorInput.value = generateRandomColor();
        customColors.middle = middleColorInput.value;
        updateSettings();
        drawMandelbrot();
    }

    function randomizeEndColor() {
        endColorInput.value = generateRandomColor();
        customColors.end = endColorInput.value;
        updateSettings();
        drawMandelbrot();
    }

    // Event listener to toggle custom resolution fields based on selection
    resolutionSelect.addEventListener('change', function() {
        if (resolutionSelect.value === 'custom') {
            customResContainer.style.display = 'flex'; // Show and align fields
        } else {
            customResContainer.style.display = 'none';
        }
    });

    // Function to render the Mandelbrot set with colorful gradients
    function drawMandelbrot() {
        const width = canvas.width;
        const height = canvas.height;

        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const c = mapToComplexPlane(x, y, width, height, zoom, offsetX, offsetY);
                const n = computeMandelbrot(c, maxIterations);

                const color = getColor(n, maxIterations);
                const [r, g, b] = color.match(/\d+/g).map(Number); // Extract RGB values from HSL or RGB

                const index = (x + y * width) * 4;
                data[index] = r;     // Red
                data[index + 1] = g; // Green
                data[index + 2] = b; // Blue
                data[index + 3] = 255; // Alpha
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    // Update zoom value and redraw
    zoomSlider.addEventListener('input', () => {
        zoom = parseFloat(zoomSlider.value);
        zoomValue.textContent = zoom.toFixed(1);
        updateSettings();
        drawMandelbrot(); // Redraw Mandelbrot on zoom change
    });

    // Update iteration count and redraw
    iterationSlider.addEventListener('input', () => {
        maxIterations = parseInt(iterationSlider.value, 10);
        iterationValue.textContent = maxIterations;
        updateSettings();
        drawMandelbrot(); // Redraw Mandelbrot on iteration change
    });

    // Reset view to default
    resetButton.addEventListener('click', () => {
        zoom = 0.5;
        offsetX = 0;
        offsetY = 0;
        zoomSlider.value = zoom;
        zoomValue.textContent = zoom;
        maxIterations = 100;
        iterationSlider.value = maxIterations;
        iterationValue.textContent = maxIterations;
        colorScheme = 'fire';
        colorSchemeDropdown.value = 'fire';
        customColors = { start: '#000000', middle: '#ff0000', end: '#ffffff' }; // Reset custom colors
        updateSettings();
        drawMandelbrot(); // Redraw Mandelbrot after reset
    });

    // Handle canvas click to pan to new location
    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Map the clicked canvas coordinates to the complex plane
        const clickedPoint = mapToComplexPlane(x, y, canvas.width, canvas.height, zoom, offsetX, offsetY);

        // Update offsets to center on the clicked point
        offsetX = clickedPoint.real;
        offsetY = clickedPoint.imag;

        updateSettings();
        drawMandelbrot(); // Redraw Mandelbrot after panning
    });

    // Zoom Step Controls
    function updateZoom(newZoom) {
        zoom = Math.max(0.5, zoom + newZoom); // Ensure zoom never goes below 0.5x
        zoomSlider.value = zoom;
        zoomValue.textContent = zoom.toFixed(1);
        updateSettings();
        drawMandelbrot();
    }

    // Zoom In Step Controls
    zoomIn1x.addEventListener('click', () => updateZoom(1));
    zoomIn10x.addEventListener('click', () => updateZoom(10));
    zoomIn100x.addEventListener('click', () => updateZoom(100));
    zoomIn1000x.addEventListener('click', () => updateZoom(1000));

    // Zoom Out Step Controls
    zoomOut1x.addEventListener('click', () => updateZoom(-1));
    zoomOut10x.addEventListener('click', () => updateZoom(-10));
    zoomOut100x.addEventListener('click', () => updateZoom(-100));
    zoomOut1000x.addEventListener('click', () => updateZoom(-1000));

    // Color Scheme Change
    colorSchemeDropdown.addEventListener('change', (event) => {
        colorScheme = event.target.value;
        updateSettings();

        // Show or hide custom color inputs and random buttons based on selection
        if (colorScheme === 'custom') {
            customColorsDiv.classList.remove('hidden');
            randomControlsDiv.classList.remove('hidden');
        } else {
            customColorsDiv.classList.add('hidden');
            randomControlsDiv.classList.add('hidden');
        }

        drawMandelbrot(); // Redraw Mandelbrot on color scheme change
    });

    // Listen for custom color input changes to update the color scheme automatically
    startColorInput.addEventListener('input', () => {
        customColors.start = startColorInput.value;
        updateSettings();
        drawMandelbrot();
    });

    middleColorInput.addEventListener('input', () => {
        customColors.middle = middleColorInput.value;
        updateSettings();
        drawMandelbrot();
    });

    endColorInput.addEventListener('input', () => {
        customColors.end = endColorInput.value;
        updateSettings();
        drawMandelbrot();
    });

    // Randomization Listeners
    randomizeAllButton.addEventListener('click', randomizeAllColors);
    randomizeStartButton.addEventListener('click', randomizeStartColor);
    randomizeMiddleButton.addEventListener('click', randomizeMiddleColor);
    randomizeEndButton.addEventListener('click', randomizeEndColor);

    // Save the current canvas view as a PNG file
    saveButton.addEventListener('click', function() {
        const link = document.createElement('a');
        link.download = 'mandelbrot_view.png';  // Set the default filename
        link.href = canvas.toDataURL('image/png');  // Get the canvas data as a PNG file
        link.click();  // Trigger download
    });

    // Ensure cancel button and time indicator are hidden on page load
    cancelButtonContainer.style.display = "none";
    timeIndicator.textContent = 'Elapsed: 0m 0s, Remaining: --';

    // Initial draw
    drawMandelbrot();
});
