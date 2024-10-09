const canvas = document.getElementById('mandelbrotCanvas');
const ctx = canvas.getContext('2d');

let zoom = 1.0;
let offsetX = 0;
let offsetY = 0;
let maxIterations = 100;
let colorScheme = 'vibrant'; // Default color scheme

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
            return `rgb(${gray}, ${gray}, ${gray})`;

        case 'blackWhite':
            return t === 1 ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';

        case 'fire':
            const fireRed = Math.floor(255 * t);
            const fireGreen = Math.floor(100 * t);
            return `rgb(${fireRed}, ${fireGreen}, 0)`; // Red to yellow transition

        case 'cool':
            const blue = Math.floor(255 * (1 - t));
            const green = Math.floor(255 * t);
            return `rgb(0, ${green}, ${blue})`; // Blue to green transition

        case 'custom': // Custom gradient
            return getCustomGradientColor(t);

        case 'vibrant':
        default:
            const hue = Math.floor(360 * t); // Map iterations to hue (0-360)
            const saturation = 100;
            const lightness = t < 1 ? 50 : 0; // Brighter for fewer iterations
            return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
}

// Generate a custom gradient color based on t (0 to 1)
function getCustomGradientColor(t) {
    const startColor = hexToRgb(startColorInput.value);
    const middleColor = hexToRgb(middleColorInput.value);
    const endColor = hexToRgb(endColorInput.value);

    let color;
    if (t < 0.5) {
        color = interpolateColor(startColor, middleColor, t * 2); // Interpolate between start and middle
    } else {
        color = interpolateColor(middleColor, endColor, (t - 0.5) * 2); // Interpolate between middle and end
    }

    return `rgb(${color.r}, ${color.g}, ${color.b})`;
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
    return `#${randomColor.padStart(6, '0')}`;
}

// Randomize all colors
function randomizeAllColors() {
    startColorInput.value = generateRandomColor();
    middleColorInput.value = generateRandomColor();
    endColorInput.value = generateRandomColor();
    drawMandelbrot();
}

// Randomize individual colors
function randomizeStartColor() {
    startColorInput.value = generateRandomColor();
    drawMandelbrot();
}

function randomizeMiddleColor() {
    middleColorInput.value = generateRandomColor();
    drawMandelbrot();
}

function randomizeEndColor() {
    endColorInput.value = generateRandomColor();
    drawMandelbrot();
}

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
    drawMandelbrot();
});

// Update iteration count and redraw
iterationSlider.addEventListener('input', () => {
    maxIterations = parseInt(iterationSlider.value, 10);
    iterationValue.textContent = maxIterations;
    drawMandelbrot();
});

// Reset view to default
resetButton.addEventListener('click', () => {
    zoom = 1.0;
    offsetX = 0;
    offsetY = 0;
    zoomSlider.value = zoom;
    zoomValue.textContent = zoom;
    drawMandelbrot();
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

    drawMandelbrot();
});

// Zoom Step Controls
function updateZoom(newZoom) {
    zoom = Math.max(0.5, zoom + newZoom); // Ensure zoom never goes below 0.5x
    zoomSlider.value = zoom;
    zoomValue.textContent = zoom.toFixed(1);
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
    
    // Show or hide custom color inputs and random buttons based on selection
    if (colorScheme === 'custom') {
        customColorsDiv.classList.remove('hidden');
        randomControlsDiv.classList.remove('hidden');
    } else {
        customColorsDiv.classList.add('hidden');
        randomControlsDiv.classList.add('hidden');
    }

    drawMandelbrot();
});

// Randomization Listeners
randomizeAllButton.addEventListener('click', randomizeAllColors);
randomizeStartButton.addEventListener('click', randomizeStartColor);
randomizeMiddleButton.addEventListener('click', randomizeMiddleColor);
randomizeEndButton.addEventListener('click', randomizeEndColor);

// Initial draw
drawMandelbrot();
