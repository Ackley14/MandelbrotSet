self.onmessage = function(e) {
    const settings = e.data;
    const { width, height, zoom, offsetX, offsetY, maxIterations, colorScheme, customColors, juliaConstant, setType } = settings;

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    let totalPixels = width * height;
    let renderedPixels = 0;
    let chunkSize = 1350;

    // Function to map the pixel coordinates to the complex plane
    function mapToComplexPlane(x, y, width, height, zoom, offsetX, offsetY) {
        const real = (x - width / 2) / (0.5 * zoom * width) + offsetX;
        const imag = (y - height / 2) / (0.5 * zoom * height) + offsetY;
        return { real, imag };
    }

    // Function to compute if a point is in the Mandelbrot or Julia set
    function computeFractal(c, maxIterations, julia = false, juliaC = { real: -0.7, imag: 0.27015 }) {
        let z = julia ? { real: c.real, imag: c.imag } : { real: 0, imag: 0 };  // Julia uses different initial conditions
        let n = 0;
        while (n < maxIterations) {
            const realTemp = z.real * z.real - z.imag * z.imag + (julia ? juliaC.real : c.real);
            z.imag = 2 * z.real * z.imag + (julia ? juliaC.imag : c.imag);
            z.real = realTemp;

            if (z.real * z.real + z.imag * z.imag > 4) break;
            n++;
        }
        return n;
    }

    // Function to create colors based on iterations and selected color scheme
    function getColor(n, maxIterations, colorScheme, customColors) {
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
                const startColor = hexToRgb(customColors.start);
                const middleColor = hexToRgb(customColors.middle);
                const endColor = hexToRgb(customColors.end);

                let color;
                if (t < 0.5) {
                    color = interpolateColor(startColor, middleColor, t * 2); // Interpolate between start and middle
                } else {
                    color = interpolateColor(middleColor, endColor, (t - 0.5) * 2); // Interpolate between middle and end
                }

                return `rgb(${color.r},${color.g},${color.b})`;

            default:
                return `rgb(0,0,0)`;
        }
    }

    // Helper function to interpolate between two colors
    function interpolateColor(start, end, t) {
        return {
            r: Math.floor(start.r + (end.r - start.r) * t),
            g: Math.floor(start.g + (end.g - start.g) * t),
            b: Math.floor(start.b + (end.b - start.b) * t)
        };
    }

    // Helper function to convert hex to RGB
    function hexToRgb(hex) {
        const bigint = parseInt(hex.slice(1), 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
        };
    }

    // Function to render chunks of the fractal
    function renderChunk() {
        for (let i = 0; i < chunkSize; i++) {
            if (renderedPixels >= totalPixels) {
                canvas.convertToBlob().then(blob => {
                    self.postMessage({ type: 'complete', blob });
                });
                return;
            }

            let x = renderedPixels % width;
            let y = Math.floor(renderedPixels / width);

            let c = mapToComplexPlane(x, y, width, height, zoom, offsetX, offsetY);
            let n = computeFractal(c, maxIterations, setType === 'julia', juliaConstant);

            let color = n === maxIterations ? 'rgb(0, 0, 0)' : getColor(n, maxIterations, colorScheme, customColors);
            let [r, g, b] = color.match(/\d+/g).map(Number);

            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, y, 1, 1);

            renderedPixels++;
        }

        self.postMessage({ type: 'progress', progress: (renderedPixels / totalPixels) * 100 });
        setTimeout(renderChunk, 0); // Yield to the browser for smooth rendering
    }

    renderChunk();
};
